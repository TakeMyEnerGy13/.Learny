/**
 * The notes are the only channel that reaches a voice call as instruction, and
 * they are silently TRUNCATED at 200 characters by the runtime that builds the
 * grounding section. A note that overflows loses its tail — which is exactly
 * where the pace and the "open in character" order sit — and the call opens
 * generic again with nothing in the logs to say why.
 *
 * So the worst combination is measured here, not estimated: every language ×
 * mode × scene × pace, checked to fit and to still carry what it was written to
 * carry.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  heroNotes,
  MAX_NOTE_CHARS,
  NOTE_MARKER,
  practiceNotes,
} from './practice-brief.ts';
import { PRACTICE_MODES, PRACTICE_PACES, PRACTICE_SCENARIOS } from './PracticeModes.tsx';
import { PRACTICE_LANGUAGES } from './practice-voice.tsx';

function everyRoomNote(): Array<{ label: string; notes: string[] }> {
  const all: Array<{ label: string; notes: string[] }> = [];
  for (const language of PRACTICE_LANGUAGES) {
    for (const mode of PRACTICE_MODES) {
      for (const scenario of PRACTICE_SCENARIOS) {
        for (const pace of PRACTICE_PACES) {
          all.push({
            label: `${language}/${mode}/${scenario}/${pace}`,
            notes: practiceNotes({ language, mode, scenario, pace }),
          });
        }
      }
    }
  }
  return all;
}

describe('practice notes', () => {
  it('every combination fits the runtime’s per-note limit', () => {
    for (const { label, notes } of everyRoomNote()) {
      for (const note of notes) {
        assert.ok(
          note.length <= MAX_NOTE_CHARS,
          `${label}: note is ${note.length} chars — over the ${MAX_NOTE_CHARS} limit: ${note}`,
        );
      }
    }
  });

  it('carries the scene and who answers in it — the whole point of the note', () => {
    const [setup] = practiceNotes({
      language: 'german',
      mode: 'scenario',
      scenario: 'airport',
      pace: 'slow',
    });
    assert.match(setup, /practising German/);
    assert.match(setup, /flight attendant/);
    assert.match(setup, /answer in character/);
    assert.match(setup, /Speak slowly/);
  });

  it('says nothing about a pace that needs no saying', () => {
    const [setup] = practiceNotes({
      language: 'english',
      mode: 'free',
      scenario: 'cafe',
      pace: 'normal',
    });
    assert.doesNotMatch(setup, /Speak/);
  });

  it('claims no role-play from a mode that is not one', () => {
    for (const mode of ['free', 'questions', 'corrections'] as const) {
      const [setup] = practiceNotes({ language: 'spanish', mode, scenario: 'airport', pace: 'slow' });
      assert.doesNotMatch(setup, /flight attendant/, mode);
      assert.doesNotMatch(setup, /Role-play/, mode);
    }
  });

  it('every note is ours to replace — marked, so a changed setup cannot pile up', () => {
    for (const { label, notes } of everyRoomNote()) {
      for (const note of notes) {
        assert.ok(note.startsWith(NOTE_MARKER), `${label}: unmarked note ${note}`);
      }
    }
    for (const note of heroNotes({ language: 'russian' })) {
      assert.ok(note.startsWith(NOTE_MARKER), note);
    }
  });

  it('the landing page claims only the language — it has no mode or scene to claim', () => {
    const notes = heroNotes({ language: 'spanish' });
    assert.equal(notes.length, 1);
    assert.match(notes[0] ?? '', /practising Spanish/);
    assert.doesNotMatch(notes.join(' '), /Role-play|barista|interviewer/);
  });

  it('claims nothing about the spoken language — that is the session locale now', () => {
    const room = practiceNotes({
      language: 'german',
      mode: 'free',
      scenario: 'cafe',
      pace: 'normal',
    });
    assert.equal(room.length, 1);
    // A note asking for a language switch was locked out by the platform and is
    // gone for good: the call switches the session locale instead.
    assert.doesNotMatch(room.join(' '), /request to continue|switch/i);
    assert.doesNotMatch(heroNotes({ language: 'english' }).join(' '), /request to continue|switch/i);
  });
});
