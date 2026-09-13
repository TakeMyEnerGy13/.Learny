/**
 * The learner profile: what Learny.ai remembers about one person between visits.
 *
 * WHY this file exists at all. A language school's memory of a student is carried
 * by the teacher. Learny has no teacher on purpose — the agent IS the service — so
 * without this file every visit is day one: no level, nothing we worked on, no
 * mistake we have seen three times. That makes "learn as long as you need"
 * impossible, which is the product, not a nicety.
 *
 * WHERE it lives, and why not somewhere better. The records plane is not enabled
 * for this account, so `ctx.records` would deny every write at runtime while the
 * build stayed green. `private/` is scoped to ONE session, which is exactly the
 * amnesia we are fixing. That leaves `common/` — agent-wide, cloud-synced storage
 * — with the per-learner scoping done by us, in the filename. See
 * `.agentplace/high-level-architecture.md`.
 *
 * WHO the id belongs to. It is minted in the visitor's browser, not issued by a
 * login, because a demo that demands a Google account before it will talk to you
 * is a worse demo. The honest consequence: the profile follows the BROWSER, and
 * another device is another learner. Every screen that shows remembered facts says
 * so rather than implying an account exists.
 *
 * Everything here is pure except the two io helpers at the bottom, so the merge
 * rules that decide what we remember are testable without a storage backend.
 */
/**
 * One slip we have seen. `count` is what separates a recurring problem worth
 * naming from a typo, so it is stored rather than recomputed.
 */
export interface LearnerMistake {
  text: string;
  count: number;
  at: string;
}

export interface LearnerLevel {
  /** The agent's ESTIMATE, e.g. "A2" — never a certificate. */
  code: string;
  /** One line of why, in the learner's own language. */
  note: string;
  at: string;
}

export interface LearnerProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Including the current one, so the first visit reads 1. */
  visits: number;
  /** Interface locale the visitor reads: en | ru | es | de. */
  native: string | null;
  /** Practice language last used. */
  language: string | null;
  level: LearnerLevel | null;
  spokenSeconds: number;
  writtenTurns: number;
  scenes: string[];
  mistakes: LearnerMistake[];
  /** End of the PREVIOUS visit — null on a first one. */
  lastSeenAt: string | null;
}

/** One observation. Every field is optional: a caller sends only what it saw. */
export interface LearnerMemoryPatch {
  native?: string | null;
  language?: string | null;
  level?: { code?: string | null; note?: string | null } | null;
  /** Seconds of THIS call — a delta, never a total. */
  spokenSeconds?: number | null;
  writtenTurns?: number | null;
  scene?: string | null;
  mistake?: string | null;
}

/**
 * Ids are minted client-side, so treat them as untrusted input: this pattern is
 * what keeps one out of the storage path (`common/learners/<id>.json`).
 */
export const LEARNER_ID_PATTERN = /^[a-z0-9]{12,48}$/;

/** Practice languages Learny offers. A patch naming anything else is ignored. */
const LANGUAGES = new Set(['spanish', 'english', 'german', 'russian']);
/** Interface locales the site exists in. */
const LOCALES = new Set(['en', 'ru', 'es', 'de']);

/** Keep the file small and the summary short — both are read by the model. */
const MISTAKE_LIMIT = 12;
const SCENE_LIMIT = 8;
/** Model-authored strings land here, so cap them before they are stored. */
const TEXT_LIMIT = 140;

export function learnerPath(id: string): string {
  return `common/learners/${id}.json`;
}

function nowIso(now?: Date): string {
  return (now ?? new Date()).toISOString();
}

/**
 * Emphasis markers, dropped on the way in and on the way out.
 *
 * The corrections we store are written by the model for a page that renders
 * markdown, so they arrive with `**mir ist kalt**` in them. This profile is read
 * somewhere else entirely — a plain fact on the progress page, and a line spoken
 * into a live call — and in both places the stars are noise the learner can see
 * (owner-visible: raw `**` on the memory page). Applied on READ as well, so records
 * kept before this cleaned themselves up without a migration.
 */
function stripEmphasis(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[\s(«"„])[*_](\S(?:.*?\S)?)[*_](?=[\s.,;:!?)»"“]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1');
}

/** One line, no control characters, bounded — safe to store and to re-read aloud. */
function cleanText(value: unknown, limit = TEXT_LIMIT): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const flat = stripEmphasis(value.replace(/\s+/g, ' ')).trim();
  if (!flat) {
    return null;
  }
  return flat.length > limit ? `${flat.slice(0, limit - 1).trimEnd()}…` : flat;
}

function cleanCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Compare mistakes by meaning, not by punctuation or case, so one slip counts once. */
function mistakeKey(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, '').replace(/\s+/g, ' ').trim();
}

export function emptyProfile(id: string, now?: Date): LearnerProfile {
  const at = nowIso(now);
  return {
    id,
    createdAt: at,
    updatedAt: at,
    visits: 0,
    native: null,
    language: null,
    level: null,
    spokenSeconds: 0,
    writtenTurns: 0,
    scenes: [],
    mistakes: [],
    lastSeenAt: null,
  };
}

/**
 * Read a stored profile defensively. The file outlives the code that wrote it, so
 * a field we later rename or drop must degrade to a default rather than throw and
 * lock the learner out of their own history.
 */
export function parseProfile(raw: unknown, id: string, now?: Date): LearnerProfile {
  const base = emptyProfile(id, now);
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const source = raw as Record<string, unknown>;
  const level = source.level as Record<string, unknown> | null | undefined;
  const levelCode = cleanText(level?.code, 24);

  return {
    id,
    createdAt: cleanText(source.createdAt, 40) ?? base.createdAt,
    updatedAt: cleanText(source.updatedAt, 40) ?? base.updatedAt,
    visits: cleanCount(source.visits),
    native: LOCALES.has(source.native as string) ? (source.native as string) : null,
    language: LANGUAGES.has(source.language as string) ? (source.language as string) : null,
    level:
      levelCode && level
        ? {
            code: levelCode,
            note: cleanText(level.note) ?? '',
            at: cleanText(level.at, 40) ?? base.createdAt,
          }
        : null,
    spokenSeconds: cleanCount(source.spokenSeconds),
    writtenTurns: cleanCount(source.writtenTurns),
    scenes: Array.isArray(source.scenes)
      ? Array.from(
          new Set(source.scenes.map((scene) => cleanText(scene, 40)).filter((s): s is string => !!s)),
        ).slice(-SCENE_LIMIT)
      : [],
    mistakes: Array.isArray(source.mistakes)
      ? source.mistakes
          .map((entry) => {
            const item = entry as Record<string, unknown>;
            const text = cleanText(item?.text);
            return text
              ? {
                  text,
                  count: Math.max(1, cleanCount(item.count)),
                  at: cleanText(item.at, 40) ?? base.createdAt,
                }
              : null;
          })
          .filter((m): m is LearnerMistake => !!m)
          .slice(-MISTAKE_LIMIT)
      : [],
    lastSeenAt: cleanText(source.lastSeenAt, 40),
  };
}

/**
 * A visit begins. `lastSeenAt` deliberately captures the END of the PREVIOUS
 * visit before this one overwrites it — that is the fact a returning learner is
 * shown ("three days ago"), and it would be meaningless once `updatedAt` moves.
 */
export function applyArrival(profile: LearnerProfile, now?: Date): LearnerProfile {
  const at = nowIso(now);
  return {
    ...profile,
    visits: profile.visits + 1,
    lastSeenAt: profile.visits > 0 ? profile.updatedAt : null,
    updatedAt: at,
  };
}

/**
 * Merge one observation into the profile. Counters ACCUMULATE (a patch carries the
 * delta of one call, never a total the client computed), judgements REPLACE, and a
 * repeated mistake increments instead of appearing twice — the count is what tells
 * a recurring problem apart from a one-off slip.
 */
export function applyMemory(
  profile: LearnerProfile,
  patch: LearnerMemoryPatch,
  now?: Date,
): LearnerProfile {
  const at = nowIso(now);
  const next: LearnerProfile = { ...profile, updatedAt: at };

  if (patch.native && LOCALES.has(patch.native)) {
    next.native = patch.native;
  }
  if (patch.language && LANGUAGES.has(patch.language)) {
    next.language = patch.language;
  }
  const levelCode = cleanText(patch.level?.code, 24);
  if (levelCode) {
    next.level = { code: levelCode, note: cleanText(patch.level?.note) ?? '', at };
  }

  const spoken = cleanCount(patch.spokenSeconds);
  if (spoken > 0) {
    next.spokenSeconds = profile.spokenSeconds + spoken;
  }
  const written = cleanCount(patch.writtenTurns);
  if (written > 0) {
    next.writtenTurns = profile.writtenTurns + written;
  }

  const scene = cleanText(patch.scene, 40);
  if (scene) {
    next.scenes = [...profile.scenes.filter((s) => s !== scene), scene].slice(-SCENE_LIMIT);
  }

  const mistake = cleanText(patch.mistake);
  if (mistake) {
    const key = mistakeKey(mistake);
    const kept = profile.mistakes.filter((m) => mistakeKey(m.text) !== key);
    const seen = profile.mistakes.find((m) => mistakeKey(m.text) === key);
    next.mistakes = [
      ...kept,
      { text: seen?.text ?? mistake, count: (seen?.count ?? 0) + 1, at },
    ].slice(-MISTAKE_LIMIT);
  }

  return next;
}

/** Mistakes worth mentioning: seen more than once, most repeated first. */
export function recurringMistakes(profile: LearnerProfile): LearnerMistake[] {
  return profile.mistakes
    .filter((m) => m.count > 1)
    .sort((a, b) => b.count - a.count || (a.at < b.at ? 1 : -1));
}

/**
 * The one-line memory the AGENT is given. It rides into the model's context on the
 * action log — no tool call, no extra turn — so it must read as a briefing and stay
 * short: this text competes for context with everything else on the turn.
 */
export function summariseProfile(profile: LearnerProfile): string {
  if (profile.visits <= 1) {
    return 'New learner, first visit — nothing remembered yet.';
  }
  const parts = [`Returning learner, visit ${profile.visits}`];
  if (profile.language) {
    parts.push(`practises ${profile.language}`);
  }
  if (profile.native) {
    parts.push(`reads ${profile.native}`);
  }
  if (profile.level) {
    parts.push(`level ~${profile.level.code}`);
  }
  if (profile.spokenSeconds >= 60) {
    parts.push(`${Math.round(profile.spokenSeconds / 60)} min spoken so far`);
  }
  if (profile.writtenTurns > 0) {
    parts.push(`${profile.writtenTurns} written turns`);
  }
  const scenes = profile.scenes.slice(-3);
  if (scenes.length > 0) {
    parts.push(`scenes done: ${scenes.join(', ')}`);
  }
  const recurring = recurringMistakes(profile).slice(0, 3);
  if (recurring.length > 0) {
    parts.push(`recurring mistakes: ${recurring.map((m) => `${m.text} (×${m.count})`).join('; ')}`);
  }
  return `${parts.join('. ')}.`;
}

/** The narrow slice of AgentStorage this module needs — keeps it unit-testable. */
export interface ProfileStorage {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, content: Buffer): Promise<unknown>;
}

export async function readProfile(
  storage: ProfileStorage,
  id: string,
  now?: Date,
): Promise<LearnerProfile> {
  const path = learnerPath(id);
  try {
    if (!(await storage.exists(path))) {
      return emptyProfile(id, now);
    }
    const raw = await storage.readFile(path);
    return parseProfile(JSON.parse(raw.toString('utf8')), id, now);
  } catch (error) {
    // A corrupt or half-written file must not lock the learner out of the site.
    console.warn('[LearnerProfile] Unreadable profile, starting a fresh one:', id, error);
    return emptyProfile(id, now);
  }
}

export async function writeProfile(
  storage: ProfileStorage,
  profile: LearnerProfile,
): Promise<void> {
  await storage.writeFile(
    learnerPath(profile.id),
    Buffer.from(JSON.stringify(profile, null, 2), 'utf8'),
  );
}

/**
 * Read-modify-write serialised per learner. A call ending while the writing desk
 * saves a correction is two mutations racing on one file, and last-write-wins
 * would silently drop one of them.
 */
const inFlight = new Map<string, Promise<LearnerProfile>>();

export function updateProfile(
  storage: ProfileStorage,
  id: string,
  change: (profile: LearnerProfile) => LearnerProfile,
): Promise<LearnerProfile> {
  const queued = (inFlight.get(id) ?? Promise.resolve(null as unknown as LearnerProfile))
    .catch(() => undefined)
    .then(async () => {
      const current = await readProfile(storage, id);
      const next = change(current);
      await writeProfile(storage, next);
      return next;
    });
  inFlight.set(id, queued);
  void queued.finally(() => {
    if (inFlight.get(id) === queued) {
      inFlight.delete(id);
    }
  });
  return queued;
}
