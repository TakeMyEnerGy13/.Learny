/**
 * The brief: what the visitor's presses actually TELL a running voice call.
 *
 * Why this file has to exist. The live voice session is not the same reader as
 * the agent: our `instruction.md` — where every rule about modes, scenes and
 * pace is written — never reaches the voice model. What that model IS shown,
 * before every single sentence it speaks, is the current screen: the declared
 * fields of the surface with their live values. That is the whole channel. So
 * four values named `scenario`, `cafe`, `normal`, `german` reached it as four
 * bare words with no instruction attached — and a voice given no instruction
 * talks like any assistant: "hi, what shall we do?".
 *
 * This composer turns those presses into one set of clauses the voice can obey
 * directly, published as a field value. It is therefore the real backing of the
 * room's controls, and it lands mid-call for the same reason the values do: the
 * screen is re-read before every reply, with no agent turn in between.
 *
 * Two constraints shape every word here:
 *
 * 1. **The budget.** The whole screen description is capped (600 characters in
 *    the platform's projector) and the cap is all-or-nothing: one character over
 *    and the projection replaces every field VALUE with a structural summary —
 *    which would take the brief with it and put us back to a generic voice.
 *    Hence `MAX_BRIEF_CHARS`, the terse clause style, and the single declared
 *    field on each contract. Do not let this grow into prose.
 * 2. **The language collision.** The platform tells the voice, on every response,
 *    to speak the committed session locale — which here is the visitor's OWN
 *    language (Russian for a Russian speaker), because that is what the
 *    interface is in. For a language-practice product that is backwards, so the
 *    brief says in as many words that this call is in the practice language and
 *    the interface language is good for a one-line aside only.
 *
 * English, deliberately: this is model-facing instruction, not interface copy —
 * it is never painted on the page and never translated.
 */
import type { LanguageKey } from './practice-voice.tsx';
import type { PracticeMode, PracticePace, PracticeScenario } from './PracticeModes.tsx';

/**
 * Ceiling for one composed brief, and it is a real limit, not a guess: with the
 * room's own fallback text and its one declared field, a brief this long leaves
 * the 600-character screen projection well over a hundred characters of
 * head-room. Every clause below is written to keep the worst combination
 * (longest language, longest scene, longest pace) inside it.
 */
export const MAX_BRIEF_CHARS = 300;

const LANGUAGE_NAMES: Record<LanguageKey, string> = {
  spanish: 'Spanish',
  english: 'English',
  german: 'German',
  russian: 'Russian',
};

/** Who we are in each scene. Read only in role-play mode. */
const SCENARIO_ROLES: Record<PracticeScenario, string> = {
  cafe: 'the barista taking their order',
  airport: 'the flight attendant welcoming them aboard',
  meeting: 'someone they have just met',
  interview: 'the interviewer for a job they want',
  doctor: 'the doctor asking what is wrong',
};

const PACE_CLAUSES: Record<PracticePace, string> = {
  slow: 'Speak slowly: short sentences, common words, pauses.',
  normal: 'Speak unhurried but natural.',
  native: 'Speak at full native speed, idioms included.',
};

/**
 * How the conversation is conducted. One clause each, imperative, because the
 * voice reads this as an instruction and not as documentation.
 */
function modeClause(mode: PracticeMode, scenario: PracticeScenario): string {
  switch (mode) {
    case 'scenario':
      return `Role-play: you ARE ${SCENARIO_ROLES[scenario]}. They speak first; answer in character, never as an assistant.`;
    case 'questions':
      return 'You ask, they talk: one short question at a time, no monologue.';
    case 'corrections':
      return 'Correct closely: their sentence said right, one short why, move on.';
    case 'free':
      return 'Ordinary talk: follow what they bring, fix only what blocks understanding.';
  }
}

/**
 * Names the visitor's own language for the aside clause, from the committed
 * interface locale — so it follows the language they chose at onboarding without
 * inventing a second source of truth. Any locale resolves, not just our four.
 */
function nativeLanguageName(uiLocale: string): string | null {
  const base = uiLocale.split('-')[0]?.toLowerCase() ?? '';
  if (!base) {
    return null;
  }
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(base);
    return name && name.toLowerCase() !== base ? name : null;
  } catch {
    return null;
  }
}

function languageClause(language: LanguageKey, uiLocale: string): string {
  const target = LANGUAGE_NAMES[language];
  const native = nativeLanguageName(uiLocale);
  const aside = native && native !== target ? `; ${native} only for a one-line aside` : '';
  return `Practice call: speak ${target}, not the interface language${aside}.`;
}

const HAND_BACK = 'Short turns, always hand the floor back.';

/** The room's brief: all four of its controls, in words a voice can act on. */
export function practiceBrief(input: {
  language: LanguageKey;
  mode: PracticeMode;
  scenario: PracticeScenario;
  pace: PracticePace;
  uiLocale: string;
}): string {
  return [
    languageClause(input.language, input.uiLocale),
    modeClause(input.mode, input.scenario),
    PACE_CLAUSES[input.pace],
    HAND_BACK,
  ]
    .join(' ')
    .slice(0, MAX_BRIEF_CHARS);
}

/**
 * The hero's brief. The landing page carries only the language — no mode, no
 * scene, no pace — so this claims no more than that: promising a role-play the
 * page cannot set would be a lie, and the hero's own fallback text (headline,
 * offer, plus any note the agent wrote) already spends most of the screen
 * budget, so there is no room for more here either.
 */
export function heroBrief(input: { language: LanguageKey; uiLocale: string }): string {
  return [
    languageClause(input.language, input.uiLocale),
    'Ordinary talk, fix only what blocks understanding.',
    HAND_BACK,
  ]
    .join(' ')
    .slice(0, MAX_BRIEF_CHARS);
}

/* ------------------------------------------------------------------------- *
 * The notes: the same setup, in the one channel that carries AUTHORITY
 * ------------------------------------------------------------------------- */

/**
 * Why the brief above is not enough, and what these notes are for.
 *
 * The screen reaches the voice as a DESCRIPTION — "CURRENT SCREEN: …" — while the
 * platform's own conduct script and the session-locale block reach it as
 * INSTRUCTIONS. Owner-observed consequence: pressed the airport scene, and the
 * voice happily REPORTED the brief ("the screen says speak Spanish") instead of
 * playing the part, then greeted in the interface language. A longer or louder
 * brief cannot fix that; description does not outrank instruction.
 *
 * The visitor's own saved notes DO arrive as instruction-level context: the
 * browser sends them the moment the voice socket opens — before the voice says
 * its first word — and the runtime injects them as a system-role message,
 * introduced as what the visitor has told us about themselves. That is the
 * channel that makes a call OPEN in character.
 *
 * Two consequences shape everything below:
 *
 * - **200 characters per note, hard.** The runtime truncates each entry at that
 *   length when it builds the section, so a note must say its whole thing inside
 *   it. Hence short first-person sentences and a note per concern instead of one
 *   paragraph.
 * - **Only at connect.** Notes are read when the call opens; a chip pressed
 *   mid-conversation still travels by the screen brief alone. So the notes carry
 *   the OPENING (role, scene, how to start) and the brief carries the running
 *   state.
 *
 * First person, and true to what the visitor actually chose on the page: these
 * are their own settings said back, never a preference we invented for them.
 */
export const MAX_NOTE_CHARS = 200;

/** Marks our own notes so a changed setup REPLACES them instead of piling up. */
export const NOTE_MARKER = 'Learny practice:';

/** The visitor's side of each scene, so the pair of roles is never ambiguous. */
const SCENARIO_PAIRS: Record<PracticeScenario, string> = {
  cafe: "you're the barista, I'm the customer",
  airport: "you're the flight attendant, I'm the passenger",
  meeting: "you're a new colleague, we've just met",
  interview: "you're the interviewer, I'm the candidate",
  doctor: "you're the doctor, I'm the patient",
};

const NOTE_MODE: Record<PracticeMode, (scenario: PracticeScenario) => string> = {
  scenario: (scenario) =>
    `Role-play — ${SCENARIO_PAIRS[scenario]}; I say the first line, you answer in character, never as an assistant.`,
  questions: () => 'You ask the questions and I do the talking, one short question at a time.',
  corrections: () => 'Correct my mistakes: say my sentence back correctly, one short why.',
  free: () => 'Ordinary conversation; fix only what would block understanding.',
};

const NOTE_PACE: Record<PracticePace, string> = {
  slow: 'Speak slowly.',
  normal: '',
  native: 'Speak at native speed.',
};

/*
 * There used to be a second note here: a standing permission saying that
 * speaking the practice language WAS the visitor's request to continue in it.
 * It never worked and could not: a language the visitor picked himself is
 * locked against everything except a direct spoken request, so the note only
 * spent context. The practice language now reaches the voice the one way the
 * platform accepts — the session's own committed language, switched for the
 * duration of the call by `useImmersionLocale`. What is left here is the part
 * notes ARE good for: who you are in the scene, and how fast to speak.
 */

/** The room's notes: the scene the call must be answered in, and the pace. */
export function practiceNotes(input: {
  language: LanguageKey;
  mode: PracticeMode;
  scenario: PracticeScenario;
  pace: PracticePace;
  /** What this learner keeps getting wrong, when the call is meant to drill it. */
  focus?: string;
}): string[] {
  const setup = [
    `${NOTE_MARKER} I'm practising ${LANGUAGE_NAMES[input.language]} with you.`,
    NOTE_MODE[input.mode](input.scenario),
    NOTE_PACE[input.pace],
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, MAX_NOTE_CHARS);

  // A SECOND note rather than a longer first one: each entry is truncated at 200
  // characters, and the setup must survive intact even when the focus is long.
  const focus = input.focus?.replace(/\s+/g, ' ').trim();
  if (!focus) {
    return [setup];
  }
  return [
    setup,
    `${NOTE_MARKER} I keep making this mistake — steer the talk so I have to get it right, and correct it every time: ${focus}`.slice(
      0,
      MAX_NOTE_CHARS,
    ),
  ];
}

/** The landing page knows only the language, so it claims only that. */
export function heroNotes(input: { language: LanguageKey }): string[] {
  return [`${NOTE_MARKER} I'm practising ${LANGUAGE_NAMES[input.language]} with you.`];
}
