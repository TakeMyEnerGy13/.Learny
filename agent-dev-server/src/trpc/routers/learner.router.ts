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
  /**
   * The id this visit was recorded under. Usually the one the browser sent back —
   * but when the browser could not keep it, this is the id recovered from the
   * session, and the client adopts it. Null when nothing could be resolved.
   */
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

/**
 * The session's copy of who is here.
 *
 * `localStorage` is the learner's identity papers, and some browsers refuse to
 * issue them — private windows, embedded webviews, storage-partitioned iframes.
 * Without a second copy such a visitor is a stranger on every page load INSIDE ONE
 * VISIT, which is the one loss worth preventing: the session is already theirs and
 * already scoped to them, so it can hold the id for as long as the visit lasts.
 *
 * It is a fallback, never the source of truth: a browser that DID keep its id wins,
 * because that copy is the one that outlives the session. Nothing here reaches
 * across visitors — `private/` is this session and no other.
 */
const SESSION_IDENTITY_PATH = 'private/learner-id.json';

async function idFromSession(ctx: { storage: SessionStorage }): Promise<string | null> {
  try {
    if (!(await ctx.storage.exists(SESSION_IDENTITY_PATH))) {
      return null;
    }
    const raw = JSON.parse((await ctx.storage.readFile(SESSION_IDENTITY_PATH)).toString('utf8'));
    const id = (raw as { id?: unknown }).id;
    return typeof id === 'string' && LEARNER_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function keepIdInSession(ctx: { storage: SessionStorage }, id: string): Promise<void> {
  try {
    await ctx.storage.writeFile(
      SESSION_IDENTITY_PATH,
      Buffer.from(JSON.stringify({ id }), 'utf8'),
    );
  } catch (error) {
    // The fallback failing is not the visitor's problem; the primary copy stands.
    console.warn('[Learner] could not keep the id in the session:', error);
  }
}

/** Only the two operations the identity fallback needs. */
type SessionStorage = {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, content: Buffer): Promise<unknown>;
};

export function createLearnerRouter() {
  return createRouter({
    /**
     * Read without recording a visit. Used by screens that display remembered
     * facts (progress), never by arrival — a refresh is not a new visit.
     *
     * The id is OPTIONAL, and that is the point: a page load can land straight on
     * the progress screen (a replayed session, a reload) without the arrival screen
     * ever mounting, and a browser that refuses storage then holds no id at all.
     * Owner-visible symptom when this leaned on the browser alone: a learner with
     * 39 visits was shown an empty memory. So when the browser cannot name itself,
     * the session's own copy answers — the same fallback arrival uses, and never a
     * reach across visitors.
     */
    get: publicProcedure
      .input(z.object({ id: learnerId.optional() }))
      .query(async ({ input, ctx }): Promise<{ id: string | null; profile: LearnerProfile }> => {
        const id = input.id ?? (await idFromSession(ctx));
        if (!id) {
          return { id: null, profile: emptyProfile('') };
        }
        const profile = await readProfile(ctx.storage, id);
        console.log(
          '[Learner] get:',
          id,
          input.id ? '(browser)' : '(session)',
          `visits=${profile.visits}`,
          `language=${profile.language}`,
        );
        return { id, profile };
      }),

    /**
     * A visit begins. Idempotency is the caller's job: the arrival screen calls
     * this ONCE per page load, because this is what increments the visit count.
     *
     * Two ways to say who is here, and the ORDER matters:
     *
     * - `id` — an ESTABLISHED learner, read out of the browser's own storage. It
     *   wins over everything: that copy outlives this session, so it is the one
     *   with a history behind it.
     * - `candidate` — an id the browser just minted because it had none. Used only
     *   if the session cannot name someone better. A browser arriving blank into a
     *   session that already knows its learner is the same visitor continuing (a
     *   refresh in a window that will not keep storage), so the session's answer is
     *   worth more than a brand-new stranger.
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
        const fromSession = await idFromSession(ctx);
        const id = input.id ?? fromSession ?? input.candidate ?? null;
        console.log(
          '[Learner] arrive:',
          id ?? '(unidentified)',
          input.id ? '(browser)' : id && id === fromSession ? '(session)' : '(new)',
        );
        if (!id) {
          const result: ArrivalResult = {
            id: null,
            profile: emptyProfile('unidentified0000'),
            returning: false,
            briefing: '',
          };
          return { ...result, logSummary: 'A visitor we cannot remember (no storage).' };
        }
        // A VISIT is a session, not a page load. The session already naming this
        // learner means we have counted them — a refresh, a livereload, a second
        // mount of the screen must not turn one visit into three, because the number
        // is shown back to the learner and a wrong one is worse than none.
        const counted = fromSession === id;
        try {
          const profile = await updateProfile(ctx.storage, id, (current) => {
            const arrived = counted ? current : applyArrival(current);
            return input.native ? applyMemory(arrived, { native: input.native }) : arrived;
          });
          // Kept for the rest of the visit, so a browser that loses its copy on the
          // next page load is still the same learner.
          if (!counted) {
            await keepIdInSession(ctx, id);
          }
          const result: ArrivalResult = {
            id,
            profile,
            // `visits` counts this one, so a first-ever visit reads 1. On a reload
            // within the same visit nothing was incremented, hence the same test
            // still answers correctly.
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
