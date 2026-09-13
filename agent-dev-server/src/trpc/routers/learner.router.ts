/**
 * The learner's own memory, over tRPC.
 *
 * Why the CLIENT owns these calls rather than the agent owning a tool:
 *
 * 1. The arrival turn happens BEFORE any of this. `[user opened the agent]` is
 *    answered while the browser has not yet said who it is, so the agent cannot
 *    know it is talking to a returning learner on that turn. The screen finds out
 *    instead, on mount, and shows "welcome back" with no model round-trip — the
 *    same mechanical principle the language rails already follow here.
 * 2. Most of what is worth remembering is observed by the page, not judged by the
 *    model: which language was pressed, how long the call actually lasted, which
 *    scene was played, which correction the writing desk already parsed out of the
 *    reply. Routing those through the model would be slower and less accurate.
 * 3. The agent still learns everything, for free: `loggedProcedure` writes a
 *    `logSummary` that the platform flushes into the model's context on the
 *    visitor's next message. So the memory arrives as a briefing without spending
 *    a tool call or a turn.
 *
 * Only the level ESTIMATE is the model's judgement, and it reaches storage the same
 * way as the rest — the agent puts it on a screen, the screen saves it.
 */
import { z } from 'zod';

import { createRouter, publicProcedure } from '../init.ts';
import { loggedProcedure } from '../middleware/action-logging.ts';
import { resolveArrivalId } from './learner-identity.ts';
import {
  applyArrival,
  applyMemory,
  emptyProfile,
  LEARNER_ID_PATTERN,
  readProfile,
  summariseProfile,
  updateProfile,
  writeProfile,
  type LearnerProfile,
} from './learner-profile.ts';

/** The id is minted in the visitor's browser, so it is validated, never trusted. */
const learnerId = z
  .string()
  .regex(LEARNER_ID_PATTERN, 'A learner id is 12-48 lowercase letters and digits.');

const memoryPatch = z.object({
  id: learnerId,
  native: z.string().max(8).optional(),
  language: z.string().max(24).optional(),
  level: z.object({ code: z.string().max(24), note: z.string().max(300).optional() }).optional(),
  /** Seconds of ONE call. A total would double-count on every save. */
  spokenSeconds: z.number().int().min(0).max(60 * 60 * 6).optional(),
  writtenTurns: z.number().int().min(0).max(500).optional(),
  scene: z.string().max(40).optional(),
  mistake: z.string().max(400).optional(),
});

/** What the browser is told. The profile is the visitor's own, so it goes back whole. */
type ArrivalResult = {
  /** The id this browser sent, or its new one-time candidate. */
  id: string | null;
  profile: LearnerProfile;
  /** True when we have met this browser before — what the arrival screen branches on. */
  returning: boolean;
  /**
   * The same one-line briefing that goes to the model on the action log, handed to
   * the client as well. The arrival turn is answered BEFORE any log flush reaches
   * the model, so when a remembered learner presses "carry on" the screen passes
   * this along as the action's context — the only channel that arrives in time for
   * that greeting. Computed once, server-side, so the two never drift.
   */
  briefing: string;
};

export function createLearnerRouter() {
  return createRouter({
    /**
     * Read without recording a visit. The browser must explicitly name its own
     * profile; no server-held fallback is permitted on a shared runtime.
     */
    get: publicProcedure
      .input(z.object({ id: learnerId.optional() }))
      .query(async ({ input, ctx }): Promise<{ id: string | null; profile: LearnerProfile }> => {
        const id = input.id ?? null;
        if (!id) {
          return { id: null, profile: emptyProfile('') };
        }
        const profile = await readProfile(ctx.storage, id);
        console.log(
          '[Learner] get:',
          id,
          '(browser)',
          `visits=${profile.visits}`,
          `language=${profile.language}`,
        );
        return { id, profile };
      }),

    /**
     * A visit begins. The browser is the only identity authority: an established
     * `id` resumes its own history; a fresh `candidate` begins a new profile.
     *
     * The arrival screen calls this once per page load, because this is what
     * increments a visit. A browser that refuses local storage stays anonymous on
     * its next load rather than inheriting another visitor's memory.
     */
    arrive: loggedProcedure
      .input(
        z.object({
          id: learnerId.optional(),
          candidate: learnerId.optional(),
          native: z.string().max(8).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const id = resolveArrivalId(input);
        console.log('[Learner] arrive:', id ?? '(unidentified)', input.id ? '(browser)' : '(new)');
        if (!id) {
          const result: ArrivalResult = {
            id: null,
            profile: emptyProfile('unidentified0000'),
            returning: false,
            briefing: '',
          };
          return { ...result, logSummary: 'A visitor we cannot remember (no storage).' };
        }
        try {
          const profile = await updateProfile(ctx.storage, id, (current) => {
            const arrived = applyArrival(current);
            return input.native ? applyMemory(arrived, { native: input.native }) : arrived;
          });
          const result: ArrivalResult = {
            id,
            profile,
            // A first-ever candidate reads one visit; only a browser that supplied
            // its own established id can be recognised as returning.
            returning: profile.visits > 1,
            briefing: summariseProfile(profile),
          };
          return {
            ...result,
            // This is the memory channel to the agent — see the file header.
            logSummary: result.briefing,
            logData: { visits: profile.visits, language: profile.language },
            // Nothing visible changes for OTHER screens on an arrival.
            invalidateTopics: false as const,
          };
        } catch (error) {
          console.error('[Learner] arrive failed:', id, error);
          // Never block the site on our own memory: an unremembered visitor is
          // simply treated as a new one.
          const result: ArrivalResult = {
            id,
            profile: emptyProfile(id),
            returning: false,
            briefing: '',
          };
          return {
            ...result,
            logSummary: 'Learner memory unavailable this visit.',
            invalidateTopics: false as const,
          };
        }
      }),

    /** One observation, merged in. Safe to call often; every field is optional. */
    remember: loggedProcedure.input(memoryPatch).mutation(async ({ input, ctx }) => {
      const { id, ...patch } = input;
      console.log('[Learner] remember:', id, patch);
      try {
        const profile = await updateProfile(ctx.storage, id, (current) =>
          applyMemory(current, patch),
        );
        return {
          profile,
          logSummary: summariseProfile(profile),
          logData: { changed: Object.keys(patch) },
        };
      } catch (error) {
        console.error('[Learner] remember failed:', id, error);
        return { profile: null, logSummary: 'Could not save what the learner just did.' };
      }
    }),

    /**
     * "Forget me." The learner's own data, so erasing it is their call, not an
     * owner escalation — and a demo nobody can reset is a demo nobody trusts.
     */
    forget: loggedProcedure
      .input(z.object({ id: learnerId }))
      .mutation(async ({ input, ctx }) => {
        console.log('[Learner] forget:', input.id);
        // Overwritten rather than deleted: storage exposes no delete on this
        // branch to a router, and a blank profile is what "forgotten" means here.
        const blank = emptyProfile(input.id);
        try {
          await writeProfile(ctx.storage, blank);
        } catch (error) {
          console.error('[Learner] forget failed:', input.id, error);
        }
        return {
          profile: blank,
          logSummary: 'The learner asked us to forget everything; the profile is blank again.',
        };
      }),
  });
}
