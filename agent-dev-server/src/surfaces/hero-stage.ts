import type { ComponentContract } from '../../vendor/agentplace-a2ui/contract-schema.ts';
import {
  formatServerMessage,
  serverMessage,
} from '../services/server-localization-messages.ts';

/**
 * Learny.ai's home hero. Typography carries the offer; the one action on the
 * screen is the live-voice control, which the visitor presses themselves —
 * the agent can invite a call, never open one.
 *
 * Its wording is NOT a prop. Every line of this screen is fixed brand copy
 * owned by the interface, so pressing a language in the header retranslates
 * the whole page instantly, with no agent turn and no chance of the model
 * rewriting the offer. The single prop is which language the visitor
 * practises — the one thing that is a decision rather than copy.
 *
 * These messages are the CHANNEL projection of that copy (SMS, email, voice),
 * kept separate from the screen's own descriptors: same wording, different
 * reader, so each side can be worded for its medium.
 */
const heroMessages = {
  headline: serverMessage({
    id: 'hero.fallback.headline',
    defaultMessage: 'Learn a language by speaking it.',
    description: 'Heading of the home screen as plain text for readers that cannot render it.',
  }),
  description: serverMessage({
    id: 'hero.fallback.description',
    defaultMessage:
      'Press the microphone to talk. We reply in the language you are learning and correct you as you go.',
    description: 'Supporting line of the home screen as plain text for non-web readers.',
  }),
  chooseAndSpeak: serverMessage({
    id: 'hero.fallback.chooseAndSpeak',
    defaultMessage:
      'Choose Spanish, English, German or Russian on the screen, then press the microphone to start speaking.',
    description:
      'Call to action of the home screen as plain text. Deliberately names all four languages ' +
      'and never claims one of them is selected — this text is frozen when the screen renders, ' +
      'while the visitor keeps switching languages on it afterwards with no new render.',
  }),
};

export const HERO_STAGE: ComponentContract = {
  component: 'HeroStage',
  purpose:
    'The home hero of Learny.ai: the offer, and the live-voice control the visitor presses to ' +
    'start speaking. Its wording belongs to the screen — you pass only the language the screen ' +
    'should OPEN on. Render it for [user opened the agent], and again when the visitor asks in ' +
    'writing for one of our other languages.',
  props: {
    initialPracticeLanguage: {
      type: 'string',
      required: true,
      enum: ['spanish', 'english', 'german', 'russian'],
      description:
        'Only the language this render STARTS on — a seed, not the current state. The visitor ' +
        'switches languages on the screen itself without an agent turn, and every switch is ' +
        'published to /practice/language. That published value is the language in play; this ' +
        'prop is history the moment they press another one. Independent of the interface ' +
        'language: never seed it from the language the visitor writes in, only from what they ' +
        'asked to practise.',
    },
    answer: {
      type: 'string',
      description:
        'Your reply to something the visitor TYPED, shown as a short note on the page just under ' +
        'the hero. Fill it whenever a typed turn deserves an answer they can read — what we cost, ' +
        'which languages, how it works, a language confirmed. There is no chat log on this page, ' +
        'so a reply left out of this prop is never seen by a reading visitor. Two to four ' +
        'sentences, in the language the visitor writes to you in, plain prose without headings, ' +
        'bullets or markdown; blank lines separate paragraphs. Omit it when nothing needs reading ' +
        '— a pure voice turn, or a press on the screen — and send it empty to clear a note that ' +
        'is no longer relevant.',
    },
  },
  publishes: {
    // The mechanical switcher on the hero writes the visitor's choice here, and
    // this is the ONLY authority on the practice language: a later turn and the
    // live voice session both read it, never the seed prop above.
    '/practice/language': { valueType: 'string' },
    // Derived from that choice, for the live voice session — see below.
    '/practice/brief': { valueType: 'string' },
  },
  actions: {
    // The visitor is done reading the site and wants to practise. Answer it by
    // rendering PracticeRoom on its OWN surfaceId (practice) — seeded from
    // /practice/language, so the room opens on the language they chose here.
    openPracticeRoom: {
      context: {},
    },
    // The chat door at the foot of an answer note. The note holds ONE answer, so
    // a visitor who wants to keep writing needs the page that keeps the whole
    // exchange: render WritingDesk on surfaceId `writing`, seeded from
    // /practice/language, and write nothing.
    openWritingDesk: {
      context: {},
    },
  },
  // Why this screen composes instead of taking the default single root node: a
  // reader of the screen — the live voice session above all — is shown a
  // section's `fields` with their CURRENT values, and nothing else. Our
  // instruction file never reaches the voice model, so a bare language value left
  // it with no idea what to DO with the call; what stands here instead is the
  // page's `brief`, the practice language written as an instruction to obey
  // (`blocks/practice-brief.ts`), republished the moment the visitor presses
  // another language mid-call. The label is model-facing metadata, never painted
  // by the React renderer, so it stays untranslated.
  //
  // One field, and a short label, because the projection is capped at 600
  // characters all-or-nothing — over the cap every value is dropped for a
  // structural summary. On this page the cap is genuinely tight: the hero's
  // fallback text carries the whole offer, and a long note written for a typed
  // question can crowd the brief out. That is the hero's limit, and part of why
  // the room, not the landing page, is where a conversation is shaped.
  compose: (props) => [
    {
      ...props,
      fields: [{ id: 'brief', label: 'CALL BRIEF (live)' }],
      id: 'root',
      component: 'HeroStage',
    },
  ],
  fallbackTemplate: (props, localization) => {
    const answer = typeof props.answer === 'string' ? props.answer.trim() : '';
    return [
      `# ${formatServerMessage(localization, heroMessages.headline)}`,
      formatServerMessage(localization, heroMessages.description),
      formatServerMessage(localization, heroMessages.chooseAndSpeak),
      // A reader off the web has no page to put a note beside, so the answer is
      // simply part of the text — and it comes first in usefulness, last in the
      // document only because the offer above frames it.
      ...(answer ? [answer] : []),
    ].join('\n\n');
  },
};
