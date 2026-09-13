import type { ComponentContract } from '../../vendor/agentplace-a2ui/contract-schema.ts';
import {
  formatServerMessage,
  serverMessage,
} from '../services/server-localization-messages.ts';

/**
 * What we remember about this learner, on a page of its own.
 *
 * Owner decision. Learny keeps a small profile of every learner (see
 * `trpc/routers/learner-profile.ts`) and until now the only place it showed was the
 * welcome-back line on arrival. That is not enough to be trusted: a site that says
 * "we remember you" owes the learner a look at exactly WHAT it remembers, and a way
 * to erase it. This page is that look.
 *
 * Like the arrival screen, it has NO props and takes nothing from the model. Every
 * number on it — visits, minutes spoken, lines written, the mistakes and how often
 * each was seen — is read straight from the learner's own profile by the component,
 * over tRPC. That is deliberate: these are facts, and a fact that travels through a
 * paraphrase stops being one. The agent's job is to decide the page should be shown;
 * the numbers are not its to type.
 *
 * The level line is the exception, and it is labelled as an ESTIMATE wherever it
 * appears, because that is what it is. We run no exams and issue no certificates.
 */
const progressMessages = {
  heading: serverMessage({
    id: 'progress.fallback.heading',
    defaultMessage: 'What we remember',
    description:
      'Heading of the learner-progress page as plain text, for readers that cannot render the screen.',
  }),
  body: serverMessage({
    id: 'progress.fallback.body',
    defaultMessage:
      'Your practice language, our estimate of your level, the time you have spoken, the lines you ' +
      'have written and the mistakes we keep seeing. Remembered in this browser, without an ' +
      'account — and you can erase it here.',
    description:
      'Description of the learner-progress page as plain text for non-web readers. Must repeat the ' +
      'honest limit: the memory belongs to one browser and there is no account.',
  }),
};

export const LEARNER_PROGRESS: ComponentContract = {
  component: 'LearnerProgress',
  purpose:
    'The page that shows the learner what Learny remembers about them: practice language, our ' +
    'ESTIMATE of their level, minutes spoken, lines written, scenes played, and the mistakes we ' +
    'keep seeing. Render it on surfaceId `progress` when they ask about their progress, their ' +
    'level, what we remember, or how we remember them. It takes NO props and reads every number ' +
    'from their own profile itself — never retype those numbers into a note or a reply, and never ' +
    'invent one. Write nothing alongside it unless they asked a question that the page does not ' +
    'answer.',
  props: {},
  publishes: {},
  actions: {
    /**
     * The point of the page: turn a remembered mistake back into practice. The
     * room is where that happens, so this hands the agent both halves of the setup
     * — which language, and what to insist on.
     */
    practiseMistakes: {
      context: {
        language: {
          type: 'string',
          description:
            'The learner’s practice language, from their profile: spanish | english | german | ' +
            'russian. Seed the room with it as initialPracticeLanguage.',
        },
        focus: {
          type: 'string',
          description:
            'The mistakes they keep making, as the writing desk recorded them — one line, most ' +
            'repeated first. Render PracticeRoom on surfaceId `room` with initialMode ' +
            '`corrections` and pass this through as its `focus` prop, which is what reaches the ' +
            'live voice as instruction. Do not rewrite or translate it, and do not list it back in ' +
            'the note: the visitor pressed a button that already says what it does.',
        },
      },
    },
  },
  compose: (props) => [{ ...props, id: 'root', component: 'LearnerProgress' }],
  fallbackTemplate: (props, localization) =>
    [
      `# ${formatServerMessage(localization, progressMessages.heading)}`,
      formatServerMessage(localization, progressMessages.body),
    ].join('\n\n'),
};
