import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyArrival,
  applyMemory,
  emptyProfile,
  LEARNER_ID_PATTERN,
  learnerPath,
  parseProfile,
  readProfile,
  recurringMistakes,
  summariseProfile,
  updateProfile,
  type LearnerProfile,
  type ProfileStorage,
} from './learner-profile.ts';

const AT = new Date('2026-03-01T10:00:00.000Z');
const LATER = new Date('2026-03-04T18:30:00.000Z');

const seeded = (over: Partial<LearnerProfile> = {}): LearnerProfile => ({
  ...emptyProfile('abcdef123456', AT),
  ...over,
});

describe('LEARNER_ID_PATTERN', () => {
  it('accepts a minted id and rejects anything that could escape the path', () => {
    assert.ok(LEARNER_ID_PATTERN.test('k7f2m9q1x4b8'));
    assert.ok(!LEARNER_ID_PATTERN.test('../../etc/passwd'));
    assert.ok(!LEARNER_ID_PATTERN.test('short'));
    assert.ok(!LEARNER_ID_PATTERN.test('UPPERCASE12345'));
    assert.ok(!LEARNER_ID_PATTERN.test('with space12'));
  });

  it('puts the id in one predictable place', () => {
    assert.equal(learnerPath('k7f2m9q1x4b8'), 'common/learners/k7f2m9q1x4b8.json');
  });
});

describe('applyArrival', () => {
  it('does not claim a last visit on the first one', () => {
    const first = applyArrival(emptyProfile('abcdef123456', AT), AT);
    assert.equal(first.visits, 1);
    assert.equal(first.lastSeenAt, null);
  });

  it('freezes the END of the previous visit before overwriting it', () => {
    const returning = applyArrival(
      seeded({ visits: 2, updatedAt: '2026-03-01T11:00:00.000Z' }),
      LATER,
    );
    assert.equal(returning.visits, 3);
    assert.equal(returning.lastSeenAt, '2026-03-01T11:00:00.000Z');
    assert.equal(returning.updatedAt, LATER.toISOString());
  });
});

describe('applyMemory', () => {
  it('accumulates spoken time instead of trusting a total from the client', () => {
    const once = applyMemory(seeded(), { spokenSeconds: 90 }, AT);
    const twice = applyMemory(once, { spokenSeconds: 30 }, LATER);
    assert.equal(twice.spokenSeconds, 120);
  });

  it('ignores a language or locale that is not ours', () => {
    const next = applyMemory(seeded(), { language: 'klingon', native: 'zz' }, AT);
    assert.equal(next.language, null);
    assert.equal(next.native, null);
  });

  it('keeps a real language and locale', () => {
    const next = applyMemory(seeded(), { language: 'german', native: 'ru' }, AT);
    assert.equal(next.language, 'german');
    assert.equal(next.native, 'ru');
  });

  it('counts a repeated mistake once, with its tally', () => {
    let profile = applyMemory(seeded(), { mistake: '«ich habe kalt» → «mir ist kalt»' }, AT);
    profile = applyMemory(profile, { mistake: 'ich habe kalt → mir ist kalt!' }, LATER);
    assert.equal(profile.mistakes.length, 1);
    assert.equal(profile.mistakes[0]?.count, 2);
    // The first wording is kept — it is the one the learner already saw.
    assert.equal(profile.mistakes[0]?.text, '«ich habe kalt» → «mir ist kalt»');
  });

  it('keeps distinct mistakes apart', () => {
    let profile = applyMemory(seeded(), { mistake: 'word order' }, AT);
    profile = applyMemory(profile, { mistake: 'dative case' }, AT);
    assert.deepEqual(
      profile.mistakes.map((m) => m.text),
      ['word order', 'dative case'],
    );
  });

  it('never grows past the mistake cap, dropping the oldest', () => {
    let profile = seeded();
    for (let index = 0; index < 20; index += 1) {
      profile = applyMemory(profile, { mistake: `slip number ${index}` }, AT);
    }
    assert.equal(profile.mistakes.length, 12);
    assert.equal(profile.mistakes[0]?.text, 'slip number 8');
  });

  it('bounds a long model-authored correction', () => {
    const profile = applyMemory(seeded(), { mistake: 'x'.repeat(400) }, AT);
    assert.ok((profile.mistakes[0]?.text.length ?? 0) <= 140);
  });

  it('strips markdown emphasis from a correction, in and out', () => {
    // The desk's corrections are written for a markdown page; the profile is read
    // as plain text on the progress screen and spoken into a call.
    const profile = applyMemory(
      seeded(),
      { mistake: '**Mir ist kalt**, nicht „ich habe kalt“; *auch jetzt* und `mir`' },
      AT,
    );
    assert.equal(
      profile.mistakes[0]?.text,
      'Mir ist kalt, nicht „ich habe kalt“; auch jetzt und mir',
    );

    // And a record kept before the stripping existed reads clean too.
    const parsed = parseProfile(
      { ...profile, mistakes: [{ text: '**ayer fui**, no «ayer voy»', count: 2, at: AT.toISOString() }] },
      profile.id,
    );
    assert.equal(parsed.mistakes[0]?.text, 'ayer fui, no «ayer voy»');
  });

  it('flattens newlines so one mistake stays one line', () => {
    const profile = applyMemory(seeded(), { mistake: 'first\n\nsecond' }, AT);
    assert.equal(profile.mistakes[0]?.text, 'first second');
  });

  it('moves a repeated scene to the end rather than duplicating it', () => {
    let profile = applyMemory(seeded(), { scene: 'airport' }, AT);
    profile = applyMemory(profile, { scene: 'cafe' }, AT);
    profile = applyMemory(profile, { scene: 'airport' }, AT);
    assert.deepEqual(profile.scenes, ['cafe', 'airport']);
  });

  it('replaces the level estimate rather than accumulating it', () => {
    let profile = applyMemory(seeded(), { level: { code: 'A2', note: 'simple sentences' } }, AT);
    profile = applyMemory(profile, { level: { code: 'B1', note: 'holds a topic' } }, LATER);
    assert.equal(profile.level?.code, 'B1');
    assert.equal(profile.level?.at, LATER.toISOString());
  });

  it('leaves everything alone for an empty patch', () => {
    const before = seeded({ visits: 2, language: 'german' });
    const after = applyMemory(before, {}, LATER);
    assert.deepEqual({ ...after, updatedAt: before.updatedAt }, before);
  });
});

describe('parseProfile', () => {
  it('survives a file written by older code', () => {
    const profile = parseProfile({ visits: 4, language: 'german' }, 'abcdef123456', AT);
    assert.equal(profile.visits, 4);
    assert.equal(profile.language, 'german');
    assert.deepEqual(profile.mistakes, []);
    assert.equal(profile.level, null);
  });

  it('refuses junk instead of throwing', () => {
    assert.equal(parseProfile('not json at all', 'abcdef123456', AT).visits, 0);
    assert.equal(parseProfile(null, 'abcdef123456', AT).visits, 0);
    assert.equal(parseProfile({ visits: -5 }, 'abcdef123456', AT).visits, 0);
  });

  it('drops a mistake entry with no text', () => {
    const profile = parseProfile(
      { mistakes: [{ count: 3 }, { text: 'real one', count: 2 }] },
      'abcdef123456',
      AT,
    );
    assert.deepEqual(
      profile.mistakes.map((m) => m.text),
      ['real one'],
    );
  });
});

describe('summariseProfile', () => {
  it('says plainly that a first-time learner is unknown', () => {
    const summary = summariseProfile(applyArrival(emptyProfile('abcdef123456', AT), AT));
    assert.match(summary, /New learner/);
  });

  it('briefs the agent with what we actually know', () => {
    const profile = seeded({
      visits: 3,
      language: 'german',
      native: 'ru',
      level: { code: 'A2', note: 'short sentences', at: AT.toISOString() },
      spokenSeconds: 420,
      writtenTurns: 11,
      scenes: ['cafe', 'airport'],
      mistakes: [
        { text: 'ich habe kalt', count: 3, at: AT.toISOString() },
        { text: 'one-off slip', count: 1, at: AT.toISOString() },
      ],
    });
    const summary = summariseProfile(profile);
    assert.match(summary, /visit 3/);
    assert.match(summary, /practises german/);
    assert.match(summary, /~A2/);
    assert.match(summary, /7 min spoken/);
    assert.match(summary, /airport/);
    assert.match(summary, /ich habe kalt \(×3\)/);
    // A slip seen once is not a pattern and must not be briefed as one.
    assert.ok(!summary.includes('one-off slip'));
  });

  it('stays short enough to sit inside a turn without crowding it', () => {
    const profile = seeded({
      visits: 9,
      language: 'spanish',
      native: 'en',
      level: { code: 'B1', note: 'x'.repeat(140), at: AT.toISOString() },
      spokenSeconds: 5000,
      writtenTurns: 200,
      scenes: ['cafe', 'airport', 'doctor', 'interview'],
      mistakes: Array.from({ length: 12 }, (_, i) => ({
        text: `recurring mistake number ${i}`,
        count: i + 2,
        at: AT.toISOString(),
      })),
    });
    assert.ok(summariseProfile(profile).length < 400, summariseProfile(profile));
  });
});

describe('recurringMistakes', () => {
  it('puts the most repeated first and hides one-offs', () => {
    const profile = seeded({
      mistakes: [
        { text: 'twice', count: 2, at: AT.toISOString() },
        { text: 'once', count: 1, at: AT.toISOString() },
        { text: 'five times', count: 5, at: AT.toISOString() },
      ],
    });
    assert.deepEqual(
      recurringMistakes(profile).map((m) => m.text),
      ['five times', 'twice'],
    );
  });
});

/** In-memory stand-in for the `common/` branch. */
function fakeStorage(seed: Record<string, string> = {}) {
  const files = new Map(Object.entries(seed));
  const storage: ProfileStorage & { files: Map<string, string> } = {
    files,
    exists: async (path) => files.has(path),
    readFile: async (path) => {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`not found: ${path}`);
      }
      return Buffer.from(content, 'utf8');
    },
    writeFile: async (path, content) => {
      files.set(path, content.toString('utf8'));
    },
  };
  return storage;
}

describe('readProfile', () => {
  it('returns a blank profile for an unknown learner', async () => {
    const profile = await readProfile(fakeStorage(), 'abcdef123456', AT);
    assert.equal(profile.visits, 0);
  });

  it('recovers from a corrupt file instead of failing the request', async () => {
    const storage = fakeStorage({ 'common/learners/abcdef123456.json': '{ broken' });
    const profile = await readProfile(storage, 'abcdef123456', AT);
    assert.equal(profile.visits, 0);
  });
});

describe('updateProfile', () => {
  it('does not lose a write when two land together', async () => {
    const storage = fakeStorage();
    const [a, b] = await Promise.all([
      updateProfile(storage, 'abcdef123456', (p) => applyMemory(p, { spokenSeconds: 60 })),
      updateProfile(storage, 'abcdef123456', (p) => applyMemory(p, { mistake: 'word order' })),
    ]);
    const stored = await readProfile(storage, 'abcdef123456');
    assert.equal(stored.spokenSeconds, 60, 'the call length survived');
    assert.equal(stored.mistakes.length, 1, 'the correction survived');
    assert.ok(a.updatedAt && b.updatedAt);
  });

  it('keeps separate learners separate', async () => {
    const storage = fakeStorage();
    await updateProfile(storage, 'aaaaaaaaaaaa', (p) => applyMemory(p, { language: 'german' }));
    await updateProfile(storage, 'bbbbbbbbbbbb', (p) => applyMemory(p, { language: 'spanish' }));
    assert.equal((await readProfile(storage, 'aaaaaaaaaaaa')).language, 'german');
    assert.equal((await readProfile(storage, 'bbbbbbbbbbbb')).language, 'spanish');
  });
});
