/**
 * Who the learner is, on this side of the wire.
 *
 * The id is minted HERE, in the browser, and never issued by a login. That is a
 * deliberate trade for a demo: nobody has to create an account before Learny will
 * talk to them, and the price is that the profile follows the browser rather than
 * the person. Every screen that shows a remembered fact says so out loud — see
 * `messages.boundToBrowser` where it is used.
 *
 * Everything here fails soft. Memory is a courtesy, not a gate: if storage is
 * unreachable, if localStorage is blocked (private windows, embedded webviews),
 * the site must behave exactly like a first visit rather than break.
 */
import { useCallback, useEffect, useState } from 'react';

import { trpc } from '@/app/lib/trpc.ts';

const ID_KEY = 'learny.learner.id';
/** Matches LEARNER_ID_PATTERN on the server: 12-48 lowercase letters and digits. */
const ID_PATTERN = /^[a-z0-9]{12,48}$/;

export type LearnerProfile = Awaited<ReturnType<typeof trpc.learner.get.query>>;

function mintId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

/**
 * The id this browser ALREADY carries, or null. Deliberately does not mint one:
 * an established id and a fresh guess are worth different amounts on arrival, and
 * only the server can weigh them against what the session knows.
 */
function storedId(): string | null {
  try {
    const stored = window.localStorage.getItem(ID_KEY);
    return stored && ID_PATTERN.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * The learner's id for this browser, minting one if it has none. Returns null when
 * storage is blocked — the arrival call then asks the SERVER who is here (the
 * session holds a copy for the length of the visit), and adopts what comes back.
 */
export function learnerId(): string | null {
  try {
    const stored = storedId();
    if (stored) {
      return stored;
    }
    const fresh = mintId();
    window.localStorage.setItem(ID_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

/** Adopts the id the server resolved, so later saves in this browser use it too. */
function adoptId(id: string): void {
  try {
    window.localStorage.setItem(ID_KEY, id);
  } catch {
    // Blocked storage is the reason we are here; nothing to do.
  }
}

/**
 * Who this page load decided we are talking to. Set once by the arrival call and
 * read by every later save, so a browser with blocked storage still files its
 * observations under the id the server recovered from the session.
 */
let resolvedId: string | null = null;

/**
 * Save one observation. Fire-and-forget by design: no screen may wait on, or fail
 * because of, our own bookkeeping.
 */
export function rememberLearner(patch: {
  native?: string;
  language?: string;
  level?: { code: string; note?: string };
  spokenSeconds?: number;
  writtenTurns?: number;
  scene?: string;
  mistake?: string;
}): void {
  const id = learnerId() ?? resolvedId;
  if (!id) {
    return;
  }
  void trpc.learner.remember.mutate({ id, ...patch }).catch(() => undefined);
}

export type LearnerArrival = {
  profile: LearnerProfile | null;
  /** True once we know we have met this browser before. */
  returning: boolean;
  /**
   * The server's one-line briefing about this learner, in the same words the model
   * gets on the action log. Passed on as the context of "carry on", because the
   * greeting turn runs before any log flush reaches the model.
   */
  briefing: string;
  /** False until the answer is in — screens must not flash the wrong arrival. */
  ready: boolean;
  forget: () => void;
};

/**
 * Records the visit and reports what we remember. Called by the ARRIVAL screen
 * only, and exactly ONCE per page load — this call is what counts a visit, so a
 * second caller would inflate the number we then show the learner.
 *
 * The guard is module-level, not a ref, and that is the point: the screen can be
 * mounted more than once in a load (a resynced surface, a remount, React 18's
 * double-invoke in development), and every one of those mounts must share the SAME
 * arrival rather than each recording its own. Whoever mounts second gets the first
 * answer.
 */
let arrival: Promise<{ profile: LearnerProfile | null; returning: boolean; briefing: string }> | null =
  null;

function requestArrival(native?: string) {
  if (arrival) {
    return arrival;
  }
  // An id we already hold is sent as ours; one we have just minted is offered only
  // as a candidate, so the session can name a better-known learner instead.
  const held = storedId();
  arrival = trpc.learner.arrive
    .mutate({
      ...(held ? { id: held } : { candidate: mintId() }),
      ...(native ? { native } : {}),
    })
    .then((result) => {
      if (result.id) {
        resolvedId = result.id;
        adoptId(result.id);
      }
      return {
        profile: result.id ? result.profile : null,
        returning: result.returning,
        briefing: result.briefing,
      };
    })
    .catch(() => ({ profile: null, returning: false, briefing: '' }));
  return arrival;
}

/**
 * Reads the profile WITHOUT recording a visit — for the progress page, which is a
 * look at the memory rather than a new arrival. Re-reads whenever `refreshKey`
 * changes, so a page that just erased everything shows the erasure.
 *
 * The id is OFFERED, not required. This screen can be the first thing a page load
 * mounts (a replayed session, a reload straight onto it), so the arrival call may
 * never have run and a browser that refuses storage holds nothing to send. In that
 * case the SERVER names the learner from the session's own copy — otherwise a
 * learner with a long history was shown an empty page, which is the one thing a
 * page about memory must never do.
 */
export function useLearnerProfile(refreshKey: unknown = 0): {
  profile: LearnerProfile | null;
  ready: boolean;
} {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const held = storedId() ?? resolvedId;
    trpc.learner.get
      .query(held ? { id: held } : {})
      .then((result) => {
        if (result.id) {
          resolvedId = result.id;
          adoptId(result.id);
        }
        if (alive) {
          setProfile(result.id ? result.profile : null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) {
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return { profile, ready };
}

/** Erases everything we remember about this browser's learner. */
export function forgetLearner(): void {
  const id = storedId() ?? resolvedId;
  if (!id) {
    return;
  }
  void trpc.learner.forget.mutate({ id }).catch(() => undefined);
  try {
    // The ledger of already-counted written turns goes too, or a wiped profile
    // would refuse to count the conversation still on the screen.
    window.localStorage.removeItem(REPORTED_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

export function useLearnerArrival(native?: string): LearnerArrival {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [returning, setReturning] = useState(false);
  const [briefing, setBriefing] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void requestArrival(native).then((result) => {
      if (!alive) {
        return;
      }
      setProfile(result.profile);
      setReturning(result.returning);
      setBriefing(result.briefing);
      setReady(true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forget = useCallback(() => {
    forgetLearner();
    setProfile(null);
    setReturning(false);
    setBriefing('');
  }, []);

  return { profile, returning, briefing, ready, forget };
}

/**
 * "3 days ago" in the visitor's own language, from the platform's own formatter —
 * no date library, and it follows the interface locale for free.
 */
export function relativeDays(iso: string | null, locale: string): string | null {
  if (!iso) {
    return null;
  }
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return null;
  }
  const days = Math.round((Date.now() - then) / 86_400_000);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (days < 1) {
      const hours = Math.round((Date.now() - then) / 3_600_000);
      return hours < 1 ? rtf.format(0, 'day') : rtf.format(-hours, 'hour');
    }
    return rtf.format(-days, 'day');
  } catch {
    return null;
  }
}

/**
 * Which written turns we have already filed.
 *
 * This ledger is the reason a reload does not inflate anyone's history. The desk
 * derives its thread from the session, so a refresh replays the SAME turns with the
 * same ids; without a record of what was already counted, every reload would add
 * another turn and bump the tally on every correction again. Ids are stable
 * messageIds, and the ledger lives in the same browser as the learner id — so it
 * has exactly the lifetime of the profile it protects.
 */
const REPORTED_KEY = 'learny.learner.reported';
const REPORTED_LIMIT = 200;

function readReported(): Set<string> {
  try {
    const raw = window.localStorage.getItem(REPORTED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function markReported(ids: readonly string[]): void {
  try {
    const kept = [...readReported(), ...ids].slice(-REPORTED_LIMIT);
    window.localStorage.setItem(REPORTED_KEY, JSON.stringify(kept));
  } catch {
    // A browser that refuses storage simply remembers nothing; not an error.
  }
}

/** The shape the writing desk's projection already produces. */
type ReportableTurn = {
  id: string;
  answer: string;
  correction: string;
  pending: boolean;
};

/**
 * Files completed written turns into the profile — one turn counted, and the
 * correction, if there was one, kept as a mistake we have now seen.
 *
 * Waits for the answer to STOP GROWING before filing. A reply streams in, and the
 * correction line is the last thing to arrive: filing on first sight would count
 * the turn and miss the very fact worth keeping. The delay is the settle, not a
 * guess at network speed — each new chunk restarts it.
 */
export function useRememberWritten(turns: readonly ReportableTurn[], language: string): void {
  const signature = turns
    .map((turn) => `${turn.id}:${turn.answer.length}:${turn.correction.length}:${turn.pending ? 1 : 0}`)
    .join('|');

  useEffect(() => {
    if (!signature) {
      return;
    }
    const timer = window.setTimeout(() => {
      const reported = readReported();
      const fresh: string[] = [];
      for (const turn of turns) {
        if (turn.pending || !turn.answer || reported.has(turn.id)) {
          continue;
        }
        fresh.push(turn.id);
        rememberLearner({
          language,
          writtenTurns: 1,
          ...(turn.correction ? { mistake: turn.correction } : {}),
        });
      }
      if (fresh.length > 0) {
        markReported(fresh);
      }
    }, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, language]);
}
