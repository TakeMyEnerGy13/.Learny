import type { ComponentContract } from '../../vendor/agentplace-a2ui/contract-schema.ts';
import {
  formatServerMessage,
  serverMessage,
} from '../services/server-localization-messages.ts';

/**
 * The practice room: Learny.ai's WORKING page, as opposed to the landing page.
 *
 * Owner decision: the site presents, this room practises, and it fits on ONE
 * screen — nothing on it sells anything and nothing on it scrolls. What is left is
 * the language ("I want to speak"), how the conversation goes, the flag with the
 * pearl control, the live state with the measured length of the call, and the pace.
 *
 * Like the hero, its wording is NOT a prop — every line belongs to the interface
 * and is already translated, so pressing an interface language retranslates the
 * room instantly with no agent turn. The props are only SEEDS for its four
 * controls (language, mode, scenario, pace) plus an optional note, which is the
 * agent's own words when the visitor types (there is no chat log on this page, so
 * a reply outside a prop is never seen).
 *
 * All four controls are mechanical, which is the whole point of this page: a
 * press changes the page and the RUNNING call, without an agent turn, because
 * each one is a declared field the live voice session re-reads before it speaks.
 *
 * It therefore declares ONE action, and only because the note on it does: the
 * chat door at the foot of a typed answer. Every CONTROL on the page is
 * mechanical, and the owner removed the "back to the site" link to give its space
 * to the language. A visitor who wants the site again asks for it in words or by
 * voice.
 */
const roomMessages = {
  heading: serverMessage({
    id: 'room.fallback.heading',
    defaultMessage: 'Practice room',
    description: 'Heading of the practice page as plain text for readers that cannot render it.',
  }),
  body: serverMessage({
    id: 'room.fallback.body',
    defaultMessage:
      'Press the microphone and speak. Interrupt any time, ask for a correction, or switch the ' +
      'practice language mid-conversation.',
    description: 'Description of the practice page as plain text for non-web readers.',
  }),
};

export const PRACTICE_ROOM: ComponentContract = {
  component: 'PracticeRoom',
  purpose:
    'The focused practice page of Learny.ai: only the live conversation and what helps while it ' +
    'runs — no offer, no plans, no landing sections. Render it when the visitor asks to practise, ' +
    'or presses the button on the home page that leads here (action openPracticeRoom). Use a ' +
    'DIFFERENT surfaceId from the home screen (practice) so the site itself stays in history.',
  props: {
    initialPracticeLanguage: {
      type: 'string',
      required: true,
      enum: ['spanish', 'english', 'german', 'russian'],
      description:
        'Only the language this room OPENS on — a seed, not the current state. Take it from ' +
        '/practice/language when the visitor has already chosen on the home page; they can switch ' +
        'it here too, mid-conversation, without an agent turn, and every switch is published back ' +
        'to /practice/language. Independent of the interface language.',
    },
    note: {
      type: 'string',
      description:
        'Your own words to the visitor in the room, shown as a short note. Fill it when they TYPE ' +
        'something — an answer, a correction, your side of written practice — because reply text ' +
        'is not shown anywhere on this page. Two to four sentences of plain prose, no markdown. ' +
        'Leave it out for a spoken turn, and send it empty to clear a note that is no longer ' +
        'relevant. Never put a plan, a price or anything about buying here: this page is for ' +
        'practising.',
    },
    initialMode: {
      type: 'string',
      enum: ['free', 'scenario', 'questions', 'corrections'],
      description:
        'Only the conversation mode the room OPENS on; the visitor switches it on the page without ' +
        'an agent turn and every switch is published to /practice/mode. Defaults to free. ' +
        '`free` = ordinary conversation. `scenario` = you play the role named by the scenario. ' +
        '`questions` = you mostly ask, so the visitor does the talking. `corrections` = you ' +
        'correct closely and explain each fix in one short line. Seed it from /practice/mode, or ' +
        'from what the visitor asked for in words.',
    },
    initialScenario: {
      type: 'string',
      enum: ['cafe', 'airport', 'meeting', 'interview', 'doctor'],
      description:
        'Which role-play the `scenario` mode opens on: ordering in a cafe, an airport counter, ' +
        'meeting someone new, a job interview, a doctor’s visit. Only meaningful together with ' +
        'mode `scenario`; the visitor picks it on the page and it is published to ' +
        '/practice/scenario. Defaults to cafe.',
    },
    initialPace: {
      type: 'string',
      enum: ['slow', 'normal', 'native'],
      description:
        'How fast and how simply you speak when the room opens: `slow` = short sentences, common ' +
        'words, clear pauses; `normal` = an unhurried but natural pace; `native` = full speed with ' +
        'no simplification. Published to /practice/pace when the visitor changes it. Defaults to ' +
        'normal.',
    },
    focus: {
      type: 'string',
      description:
        'What this call must keep an eye on: the mistakes this learner keeps making, as we recorded ' +
        'them. Fill it ONLY from the `focus` context of the progress page’s practiseMistakes action ' +
        'or from what the learner just asked to drill — never from your own impression of their ' +
        'level. Passed to the live voice as instruction, so it reaches the call itself rather than ' +
        'being described to it. Leave it out for an ordinary conversation.',
    },
  },
  publishes: {
    // Same pointer as the hero: ONE authority on the practice language for the
    // whole session, whichever page the visitor is on.
    '/practice/language': { valueType: 'string' },
    // The room's own three controls. Each is mechanical — a press changes the
    // page and the running call, and never calls the agent.
    '/practice/mode': { valueType: 'string' },
    '/practice/scenario': { valueType: 'string' },
    '/practice/pace': { valueType: 'string' },
    // Not a control: the page's own sentence-set derived from the four above,
    // written for the live voice session (`blocks/practice-brief.ts`).
    '/practice/brief': { valueType: 'string' },
  },
  actions: {
    // The chat door at the foot of a typed answer in this room. The note holds
    // ONE answer, so a visitor who wants to keep writing needs the page that keeps
    // the whole exchange: render WritingDesk on surfaceId `writing`, seeded from
    // /practice/language, and write nothing.
    openWritingDesk: {
      context: {},
    },
  },
  // Why ONE field, and why it is a sentence rather than a value. A live voice
  // call is shown this surface's declared FIELD values before every sentence it
  // speaks — and that projection is the only channel to the voice model, because
  // the agent's instruction file never reaches it. Bare values were not enough:
  // `scenario`, `normal` and `german` carry no instruction, and a voice with no
  // instruction greets like any assistant. So the page publishes `brief` — those
  // same presses written as something to obey (`blocks/practice-brief.ts`).
  //
  // Nothing else is declared because the projection has a hard character budget
  // and goes all-or-nothing: one character over and every VALUE is replaced by a
  // structural summary, brief included. The language, the mode, the scene and the
  // pace are all inside the brief in words, so repeating them raw would spend
  // budget to say the same thing twice.
  compose: (props) => [
    {
      ...props,
      fields: [{ id: 'brief', label: 'CALL BRIEF (live)' }],
      id: 'root',
      component: 'PracticeRoom',
    },
  ],
  fallbackTemplate: (props, localization) => {
    const note = typeof props.note === 'string' ? props.note.trim() : '';
    return [
      `# ${formatServerMessage(localization, roomMessages.heading)}`,
      formatServerMessage(localization, roomMessages.body),
      ...(note ? [note] : []),
    ].join('\n\n');
  },
};
