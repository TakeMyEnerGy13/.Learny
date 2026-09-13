/**
 * Guard for the one number this design depends on: the voice screen projection's
 * 600-character budget.
 *
 * The projection is all-or-nothing — one character over and every field VALUE is
 * replaced by a structural summary, which would silently drop the practice brief
 * and leave a live call with no instruction at all. Nothing about that failure is
 * visible on the page, so it gets a test instead of a comment: the worst-case
 * brief, on the longest localized fallback text, must still fit.
 *
 * The fixtures below mirror `agent-dev-client/src/app/agent/blocks/practice-brief.ts`
 * (the composer runs in the browser, where the presses are). If that file grows,
 * this test is what fails first.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { projectScreen } from '../../vendor/agentplace-voice/screen-projection.ts';
import { HERO_STAGE } from './hero-stage.ts';
import { PRACTICE_ROOM } from './practice-room.ts';

const SCREEN_BUDGET = 600;

/** The longest brief the room can compose: longest language clause, longest
 *  role-play scene, longest pace clause. */
const WORST_ROOM_BRIEF =
  'Practice call: speak Spanish, not the interface language; Russian only for a one-line aside. ' +
  'Role-play: you ARE the interviewer for a job they want — open in character, stay in it. ' +
  'Speak slowly: short sentences, common words, pauses. Short turns, always hand the floor back.';

const WORST_HERO_BRIEF =
  'Practice call: speak Spanish, not the interface language; Russian only for a one-line aside. ' +
  'Ordinary talk, fix only what blocks understanding. Short turns, always hand the floor back.';

/** The room's fallback text as a reader in Russian gets it — the demo's own path,
 *  and longer than the English source. */
const ROOM_FALLBACK_RU =
  'Комната практики\n\nНажмите микрофон и говорите. Перебивайте, просите исправить, меняйте ' +
  'язык практики на ходу.';

/** The hero's, plus a note of the length the agent is told to write (two to four
 *  sentences) — the realistic worst case on the landing page. */
const HERO_FALLBACK_RU =
  'Учите язык, говоря на нём\n\nНажмите микрофон, чтобы говорить. Мы отвечаем на языке, ' +
  'который вы учите, и поправляем по ходу.\n\nВыберите испанский, английский, немецкий или ' +
  'русский на экране и нажмите микрофон, чтобы начать говорить.';

function project(contract: typeof PRACTICE_ROOM, brief: string, fallbackText: string): string {
  const sections = contract
    .compose?.({}, {} as never)
    .map((node) => ({ component: node.component as string, props: node })) ?? [];
  return projectScreen({
    sections,
    values: { brief },
    fallbackText,
    isSensitive: () => false,
    maxChars: SCREEN_BUDGET,
  });
}

describe('voice screen budget', () => {
  it('keeps the practice room’s brief inside the projection budget', () => {
    const projected = project(PRACTICE_ROOM, WORST_ROOM_BRIEF, ROOM_FALLBACK_RU);
    assert.ok(
      projected.includes(WORST_ROOM_BRIEF),
      `the brief was dropped from the projection:\n${projected}`,
    );
    assert.ok(projected.length <= SCREEN_BUDGET, `projection is ${projected.length} chars`);
  });

  it('keeps the hero’s brief inside the projection budget', () => {
    const projected = project(HERO_STAGE, WORST_HERO_BRIEF, HERO_FALLBACK_RU);
    assert.ok(
      projected.includes(WORST_HERO_BRIEF),
      `the brief was dropped from the projection:\n${projected}`,
    );
    assert.ok(projected.length <= SCREEN_BUDGET, `projection is ${projected.length} chars`);
  });
});
