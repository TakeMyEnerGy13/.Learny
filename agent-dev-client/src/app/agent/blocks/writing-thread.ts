/**
 * The written thread, derived from the session itself.
 *
 * The writing desk shows a real conversation — everything said so far, scrollable
 * — and none of it is passed as props. It cannot be: a thread carried in props
 * would mean the model retyping the whole exchange every turn, and the first
 * paraphrase would rewrite the visitor's own words. The browser already holds
 * every message of the session, so the desk READS the session and the agent just
 * answers.
 *
 * Three things this projection has to get right, all learned from the platform's
 * own content contract:
 *
 * - **A spoken turn is not a written one.** A call produces text too (the relay
 *   speaks it), so without a filter the desk would fill up with a conversation
 *   that was never typed. Provenance is on the content and survives a reload:
 *   `channel: 'voice'` on the request, `channel`/`voiceDelivery` on the answer.
 *   Either mark disqualifies the pair.
 * - **A site turn is not a desk turn.** On the landing page and in the room the
 *   agent answers INSIDE the screen (the `answer`/`note` props), leaving the turn
 *   with no assistant text at all. Those turns are dropped rather than rendered as
 *   half-empty pairs; only text answers belong to a thread. `fromResponseId`
 *   narrows it further to the turn that opened the desk, so questions asked before
 *   the visitor came here do not reappear as the start of their practice.
 * - **The turn in flight is part of the conversation.** The visitor's message
 *   exists a second or two before the answer does, and a thread that swallows it
 *   until the reply lands looks broken. It is carried as a pending pair.
 *
 * Pure and separate from the component so the rules above can be tested without a
 * browser — see `writing-thread.test.ts`.
 */
import { ContentType, type AgentContent } from '@/lib/agent-library';

/** One written exchange: what the visitor typed, and what came back. */
export interface WrittenTurn {
  /** Stable identity — the messageId that opened the pair. */
  id: string;
  /** What the visitor typed. Empty for an answer with no visible request. */
  request: string;
  /** The answer, correction line removed. */
  answer: string;
  /** The one-line correction the agent appended, if any. */
  correction: string;
  /** The answer has not arrived yet. */
  pending: boolean;
}

/**
 * How the agent marks a correction: a line of its reply that begins with an
 * arrow. Chosen because it costs the model nothing and degrades safely — a reply
 * written without it is simply prose, never a broken render.
 */
const CORRECTION_MARKER = /^\s*(?:→|->)\s*/;

/** One run of the answer, and whether the model marked it as emphasis. */
export interface Emphasised {
  text: string;
  strong: boolean;
}

/**
 * `**went**`, not "went".
 *
 * Models write markdown emphasis whether or not they were asked to, and a page
 * that prints text verbatim shows the asterisks — observed on the first real
 * correction this desk ever rendered. Rather than fight it, the desk reads it: in
 * a correction the emphasised word is exactly the word that was wrong, so this is
 * the one piece of markdown worth honouring here.
 *
 * Deliberately narrow. Paired `**` and `__` only, on one line, with no nesting and
 * no other markdown — a full parser on a page this quiet would invite headings and
 * bullet lists into a conversation.
 */
export function splitEmphasis(text: string): Emphasised[] {
  const runs: Emphasised[] = [];
  const pattern = /(\*\*|__)(?=\S)([\s\S]*?\S)\1/g;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > index) {
      runs.push({ text: text.slice(index, at), strong: false });
    }
    runs.push({ text: match[2] ?? '', strong: true });
    index = at + match[0].length;
  }
  if (index < text.length) {
    runs.push({ text: text.slice(index), strong: false });
  }
  return runs.filter((run) => run.text.length > 0);
}

/** The synthetic opening message; never a line of the visitor's conversation. */
const ARRIVAL_MARKER = '[user opened the agent]';

interface Group {
  id: string;
  responseId: string | undefined;
  request: string;
  requestSpoken: boolean;
  answer: string;
  answerSpoken: boolean;
}

function isSpoken(content: AgentContent): boolean {
  return content.channel === 'voice' || content.voiceDelivery !== undefined;
}

function groupByRun(messages: readonly AgentContent[]): Group[] {
  const groups: Group[] = [];
  const byResponse = new Map<string, Group>();

  const open = (content: AgentContent): Group => {
    const existing = content.responseId ? byResponse.get(content.responseId) : undefined;
    if (existing) {
      return existing;
    }
    const group: Group = {
      id: content.messageId,
      responseId: content.responseId,
      request: '',
      requestSpoken: false,
      answer: '',
      answerSpoken: false,
    };
    groups.push(group);
    if (content.responseId) {
      byResponse.set(content.responseId, group);
    }
    return group;
  };

  for (const content of messages) {
    if (content.type !== ContentType.Text || content.hidden) {
      continue;
    }
    if (content.role === 'user') {
      const text = content.content.trim();
      if (text === ARRIVAL_MARKER) {
        continue;
      }
      const group = open(content);
      group.request = group.request ? `${group.request}\n${text}` : text;
      group.requestSpoken = group.requestSpoken || isSpoken(content);
      continue;
    }
    if (content.isReasoning) {
      continue;
    }
    const group = open(content);
    const text = content.content.trim();
    if (text) {
      group.answer = group.answer ? `${group.answer}\n${text}` : text;
    }
    group.answerSpoken = group.answerSpoken || isSpoken(content);
  }

  return groups;
}

/** Splits the agent's reply into prose and the correction line it may end with. */
export function splitCorrection(answer: string): { answer: string; correction: string } {
  const lines = answer.split('\n');
  const prose: string[] = [];
  const corrections: string[] = [];
  for (const line of lines) {
    if (CORRECTION_MARKER.test(line)) {
      const fixed = line.replace(CORRECTION_MARKER, '').trim();
      if (fixed) {
        corrections.push(fixed);
      }
      continue;
    }
    prose.push(line);
  }
  return {
    answer: prose.join('\n').trim(),
    correction: corrections.join(' ').trim(),
  };
}

export function buildWrittenThread({
  messages,
  pending,
  fromResponseId,
}: {
  messages: readonly AgentContent[];
  /** A typed request is in flight — its pair has no answer yet. */
  pending: boolean;
  /** Start the thread at the run that opened the desk, when it is known. */
  fromResponseId?: string | null;
}): WrittenTurn[] {
  const groups = groupByRun(messages);
  const start = fromResponseId
    ? groups.findIndex((group) => group.responseId === fromResponseId)
    : -1;
  const scoped = start >= 0 ? groups.slice(start) : groups;

  const turns: WrittenTurn[] = [];
  scoped.forEach((group, index) => {
    if (group.requestSpoken || group.answerSpoken) {
      return;
    }
    const answer = group.answer.trim();
    const last = index === scoped.length - 1;
    if (!answer) {
      // Only the turn still running earns a place without an answer, and only
      // because the visitor typed it: an empty pair from a press on the screen is
      // not a line of conversation.
      if (last && pending && group.request) {
        turns.push({
          id: group.id,
          request: group.request,
          answer: '',
          correction: '',
          pending: true,
        });
      }
      return;
    }
    const split = splitCorrection(answer);
    turns.push({
      id: group.id,
      request: group.request,
      answer: split.answer,
      correction: split.correction,
      pending: false,
    });
  });

  return turns;
}
