/**
 * The desk's thread is derived, not passed — so these rules are the whole
 * feature. Each case below is a way the session can look that would put the
 * wrong thing on the page: a spoken conversation leaking into the written one, a
 * question answered inside a screen showing up as an unanswered line, the
 * arrival marker rendered as the visitor's first sentence.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ContentType, type AgentContent } from '@/lib/agent-library';
import { buildWrittenThread, splitCorrection, splitEmphasis } from './writing-thread.ts';

function userText(
  content: string,
  extra: Partial<AgentContent> = {},
): AgentContent {
  return {
    messageId: `u-${content.slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`,
    type: ContentType.Text,
    role: 'user',
    content,
    ...extra,
  } as AgentContent;
}

function agentText(content: string, extra: Partial<AgentContent> = {}): AgentContent {
  return {
    messageId: `a-${content.slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`,
    type: ContentType.Text,
    content,
    ...extra,
  } as AgentContent;
}

describe('buildWrittenThread', () => {
  it('pairs a typed question with the answer that followed it', () => {
    const thread = buildWrittenThread({
      messages: [
        userText('I want a coffee', { responseId: 'r1' }),
        agentText('Of course. Which one?', { responseId: 'r1' }),
      ],
      pending: false,
    });

    assert.deepEqual(
      thread.map((turn) => [turn.request, turn.answer, turn.pending]),
      [['I want a coffee', 'Of course. Which one?', false]],
    );
  });

  it('never shows the arrival marker as something the visitor wrote', () => {
    const thread = buildWrittenThread({
      messages: [
        userText('[user opened the agent]', { responseId: 'r0' }),
        agentText('Welcome.', { responseId: 'r0' }),
      ],
      pending: false,
    });

    assert.deepEqual(
      thread.map((turn) => turn.request),
      [''],
    );
  });

  it('keeps a spoken conversation out of the written thread', () => {
    const thread = buildWrittenThread({
      messages: [
        userText('Ich möchte einen Kaffee', { responseId: 'r1', channel: 'voice' }),
        agentText('Gern, welchen?', { responseId: 'r1' }),
        userText('and in writing?', { responseId: 'r2' }),
        agentText('Also fine.', { responseId: 'r2' }),
      ],
      pending: false,
    });

    assert.deepEqual(
      thread.map((turn) => turn.request),
      ['and in writing?'],
    );
  });

  it('drops a spoken pair that lost its channel mark but kept delivery evidence', () => {
    const thread = buildWrittenThread({
      messages: [
        userText('spoken after a reload', { responseId: 'r1' }),
        agentText('Answered out loud.', {
          responseId: 'r1',
          voiceDelivery: { kind: 'relay', status: 'full' },
        }),
      ],
      pending: false,
    });

    assert.deepEqual(thread, []);
  });

  it('drops a turn the agent answered inside a screen instead of in text', () => {
    const thread = buildWrittenThread({
      messages: [
        userText('how much is it?', { responseId: 'r1' }),
        // The answer went into the screen's own `answer` prop — no assistant text.
        userText('let us write instead', { responseId: 'r2' }),
        agentText('Gladly.', { responseId: 'r2' }),
      ],
      pending: false,
    });

    assert.deepEqual(
      thread.map((turn) => turn.request),
      ['let us write instead'],
    );
  });

  it('shows the turn in flight so a typed message is never swallowed', () => {
    const thread = buildWrittenThread({
      messages: [
        userText('first', { responseId: 'r1' }),
        agentText('answered', { responseId: 'r1' }),
        userText('second', { responseId: 'r2' }),
      ],
      pending: true,
    });

    assert.deepEqual(
      thread.map((turn) => [turn.request, turn.pending]),
      [
        ['first', false],
        ['second', true],
      ],
    );
  });

  it('does not invent a pending line for a press on the screen', () => {
    const thread = buildWrittenThread({
      messages: [userText('first', { responseId: 'r1' }), agentText('answered', { responseId: 'r1' })],
      pending: true,
    });

    assert.deepEqual(
      thread.map((turn) => turn.pending),
      [false],
    );
  });

  it('starts at the run that opened the desk when one is known', () => {
    const thread = buildWrittenThread({
      messages: [
        userText('asked on the landing page', { responseId: 'r1' }),
        agentText('answered on the landing page', { responseId: 'r1' }),
        userText('open the chat', { responseId: 'r2' }),
        agentText('Here we are.', { responseId: 'r2' }),
        userText('ich möchte üben', { responseId: 'r3' }),
        agentText('Sehr gut.', { responseId: 'r3' }),
      ],
      pending: false,
      fromResponseId: 'r2',
    });

    assert.deepEqual(
      thread.map((turn) => turn.request),
      ['open the chat', 'ich möchte üben'],
    );
  });

  it('ignores an unknown desk run rather than emptying the thread', () => {
    const thread = buildWrittenThread({
      messages: [userText('typed', { responseId: 'r1' }), agentText('answered', { responseId: 'r1' })],
      pending: false,
      fromResponseId: 'nope',
    });

    assert.deepEqual(
      thread.map((turn) => turn.request),
      ['typed'],
    );
  });

  it('leaves reasoning out of the answer', () => {
    const thread = buildWrittenThread({
      messages: [
        userText('hallo', { responseId: 'r1' }),
        agentText('thinking about grammar', { responseId: 'r1', isReasoning: true }),
        agentText('Hallo! Wie geht es dir?', { responseId: 'r1' }),
      ],
      pending: false,
    });

    assert.deepEqual(
      thread.map((turn) => turn.answer),
      ['Hallo! Wie geht es dir?'],
    );
  });
});

describe('splitCorrection', () => {
  it('lifts an arrow line out of the prose', () => {
    const split = splitCorrection('Sehr gut!\n→ nicht "ich habe kalt", sondern "mir ist kalt"');
    assert.equal(split.answer, 'Sehr gut!');
    assert.equal(split.correction, 'nicht "ich habe kalt", sondern "mir ist kalt"');
  });

  it('accepts the ascii arrow a model may type instead', () => {
    const split = splitCorrection('Good.\n-> "I have been" not "I am been"');
    assert.equal(split.correction, '"I have been" not "I am been"');
  });

  it('leaves a reply without a marker entirely as prose', () => {
    const split = splitCorrection('Just an answer.\nSecond line.');
    assert.equal(split.answer, 'Just an answer.\nSecond line.');
    assert.equal(split.correction, '');
  });
});

describe('splitEmphasis', () => {
  it('honours the bold a model puts on the corrected word', () => {
    assert.deepEqual(splitEmphasis('Yesterday I **went** to the park.'), [
      { text: 'Yesterday I ', strong: false },
      { text: 'went', strong: true },
      { text: ' to the park.', strong: false },
    ]);
  });

  it('accepts underscores and more than one run', () => {
    assert.deepEqual(splitEmphasis('__mir__ ist __kalt__'), [
      { text: 'mir', strong: true },
      { text: ' ist ', strong: false },
      { text: 'kalt', strong: true },
    ]);
  });

  it('leaves plain text as a single run', () => {
    assert.deepEqual(splitEmphasis('nothing marked here'), [
      { text: 'nothing marked here', strong: false },
    ]);
  });

  it('does not treat an unpaired marker as emphasis', () => {
    assert.deepEqual(splitEmphasis('2 ** 3 is not bold'), [
      { text: '2 ** 3 is not bold', strong: false },
    ]);
  });
});
