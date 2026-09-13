import type { ComponentContract } from '../../vendor/agentplace-a2ui/contract-schema.ts';
import {
  formatServerMessage,
  serverMessage,
} from '../services/server-localization-messages.ts';

/**
 * The writing desk: Learny.ai's THIRD page, and the only one with a conversation
 * on it.
 *
 * Owner decision. The line at the bottom of the window stays what it is, but a
 * typed answer used to live in a single slot on the page — one note that the next
 * answer overwrote. That is enough for "what does it cost"; it is not a place to
 * practise, because practising in writing means seeing what you wrote three lines
 * ago and the correction that came back. So the note now carries a door, and this
 * is what it opens.
 *
 * The one thing that makes this screen different from the other two: **its
 * conversation is not a prop.** The browser already holds every message of the
 * session, so the React component READS the session and renders the thread
 * (`blocks/writing-thread.ts`). A thread passed as props would mean retyping the
 * whole exchange every turn, and the first paraphrase would rewrite the visitor's
 * own words.
 *
 * The consequence for the agent is the point: on THIS page a reply is ordinary
 * REPLY TEXT, not a prop — the opposite of the rule that governs the hero and the
 * room. The platform's own stage keeps this screen up for a text-only turn (it
 * carries the surface forward), so answering costs no render at all.
 */
const deskMessages = {
  heading: serverMessage({
    id: 'desk.fallback.heading',
    defaultMessage: 'Writing practice',
    description: 'Heading of the written-practice page as plain text for readers that cannot render it.',
  }),
  body: serverMessage({
    id: 'desk.fallback.body',
    defaultMessage:
      'Write in the language you are practising. Answers come back with a short correction when ' +
      'something needs fixing.',
    description: 'Description of the written-practice page as plain text for non-web readers.',
  }),
};

export const WRITING_DESK: ComponentContract = {
  component: 'WritingDesk',
  purpose:
    'The written practice page of Learny.ai: the visitor writes in the language they are learning ' +
    'and reads your answer with a short correction. Render it on surfaceId `writing` when they ' +
    'press the chat door on an answer note (action openWritingDesk) or ask to practise in writing. ' +
    'UNLIKE every other screen of this site, this one shows your ORDINARY REPLY TEXT: the page ' +
    'renders the session\'s own written conversation, so after it is up you answer in plain reply ' +
    'text and render nothing at all.',
  props: {
    initialPracticeLanguage: {
      type: 'string',
      required: true,
      enum: ['spanish', 'english', 'german', 'russian'],
      description:
        'Only the language the desk OPENS on — a seed, not the current state. Take it from ' +
        '/practice/language; the visitor can switch it here on the page without an agent turn, and ' +
        'every switch is published back to /practice/language. Independent of the interface ' +
        'language: it is what they WRITE in here, while your explanations and corrections stay in ' +
        'the language they read.',
    },
  },
  publishes: {
    // Same single authority as the other two pages: whichever screen the visitor
    // is on, this pointer is the practice language.
    '/practice/language': { valueType: 'string' },
    // The desk is the written channel, but the microphone in the input bar still
    // exists — so the page keeps the voice brief current rather than letting a
    // call opened from here inherit a stale one.
    '/practice/brief': { valueType: 'string' },
  },
  actions: {},
  compose: (props) => [
    {
      ...props,
      fields: [{ id: 'brief', label: 'CALL BRIEF (live)' }],
      id: 'root',
      component: 'WritingDesk',
    },
  ],
  fallbackTemplate: (props, localization) =>
    [
      `# ${formatServerMessage(localization, deskMessages.heading)}`,
      formatServerMessage(localization, deskMessages.body),
    ].join('\n\n'),
};
