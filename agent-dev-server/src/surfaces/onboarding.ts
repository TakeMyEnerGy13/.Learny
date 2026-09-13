import type { ComponentContract } from '../../vendor/agentplace-a2ui/contract-schema.ts';
import {
  formatServerMessage,
  serverMessage,
} from '../services/server-localization-messages.ts';

/**
 * The two questions a first-time visitor answers before they see the site:
 * "which language do you speak?" and "which one do you want to learn?".
 *
 * Owner decision: arrival starts here, not on the landing page. Everything about
 * Learny.ai depends on those two answers — the interface belongs to the language
 * the visitor already speaks, the voice belongs to the one they are learning — and
 * asking is faster and honest than guessing from a browser header.
 *
 * It has NO props. Both answers are the visitor's, taken on the page, and the
 * screen carries no wording of its own that the agent could colour: the copy is
 * interface text like the rest of the site, so it is already translated in every
 * offered language before the visitor presses anything.
 *
 * A learner we REMEMBER never sees the questions. The screen records the visit
 * itself (`trpc.learner.arrive`) and, when the browser is one we have met, replaces
 * both questions with what we remember and a "carry on" press. That branch is
 * mechanical too, and it is decided on the client on purpose: this screen is
 * rendered in answer to `[user opened the agent]`, before the browser has said who
 * it is, so the agent CANNOT know on that turn. What it learns instead arrives with
 * the press — see the `memory` context below.
 *
 * The steps do not cost agent turns. Choosing a native language advances the
 * screen locally and proposes that language as the session's interface locale, the
 * same mechanical path as the header switcher. Only the LAST press calls the
 * agent, through `startPractice`, because someone has to render the site the
 * visitor is being let into.
 */
const onboardingMessages = {
  heading: serverMessage({
    id: 'onboarding.fallback.heading',
    defaultMessage: 'Two questions before we start',
    description: 'Heading of the arrival questions as plain text for readers that cannot render it.',
  }),
  body: serverMessage({
    id: 'onboarding.fallback.body',
    defaultMessage:
      'Which language do you speak, and which one do you want to learn? Answer both and the site ' +
      'arrives set up: the interface in your own language, the conversation in the one you are ' +
      'learning. We speak Spanish, English, German and Russian.',
    description: 'The arrival questions as plain text for readers that cannot render the screen.',
  }),
};

export const LANGUAGE_ONBOARDING: ComponentContract = {
  component: 'LanguageOnboarding',
  purpose:
    'The arrival screen of Learny.ai: two questions — the language the visitor speaks, and the one ' +
    'they want to learn — after which the site opens already set up for them. Render it on ' +
    '`[user opened the agent]` with surfaceId `welcome`, and NOT again afterwards: once the ' +
    'visitor has answered (action startPractice) or skipped it (action skipOnboarding), they are ' +
    'past it for the rest of the session. It takes no props — both answers belong to the visitor.',
  props: {},
  publishes: {
    // The same single authority on the practice language the hero and the room
    // write, so the answer given here IS the language a call later speaks.
    '/practice/language': { valueType: 'string' },
    // Which language the visitor says they already speak. Not the interface
    // locale itself — that is committed over the socket like a header press —
    // but worth publishing, because it is the one thing on this site that says
    // what the visitor's own language is, and explanations belong in it.
    '/practice/native': { valueType: 'string' },
  },
  actions: {
    // Both questions answered. Context carries the pair so the agent can seed the
    // landing page with the practice language without waiting for a state sync.
    startPractice: {
      context: {
        native: {
          type: 'string',
          description: 'The language the visitor says they speak, as a locale: en | ru | es | de.',
        },
        target: {
          type: 'string',
          description:
            'The language they want to learn: spanish | english | german | russian. Seed the ' +
            'landing page with it as initialPracticeLanguage.',
        },
        returning: {
          type: 'boolean',
          description:
            'True when this is a learner we already remember, who pressed "carry on" instead of ' +
            'answering the questions. Greet them as someone continuing, not as a newcomer.',
        },
        memory: {
          type: 'string',
          description:
            'Present only with returning: one line of what we remember about this learner — ' +
            'visits, level estimate, minutes spoken, scenes played, recurring mistakes. Use it to ' +
            'make the greeting specific and to pick up where they left off. It is the same ' +
            'briefing that reaches you on the action log, sent here because that flush arrives ' +
            'after this turn. Never read the raw line out; say the ONE thing that matters now.',
        },
      },
    },
    // "Just show me the site" — a visitor who wants to look around first. Answer
    // it with the landing page and nothing else; do not ask the questions again.
    skipOnboarding: {
      context: {},
    },
    // A remembered learner wants to SEE what we remember, before continuing.
    // Answer with LearnerProgress on surfaceId `progress` and nothing else: that
    // page reads their profile itself, so there is no fact for you to repeat.
    showProgress: {
      context: {},
    },
  },
  fallbackTemplate: (_props, localization) =>
    [
      `# ${formatServerMessage(localization, onboardingMessages.heading)}`,
      formatServerMessage(localization, onboardingMessages.body),
    ].join('\n\n'),
};
