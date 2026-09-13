/**
 * "How it works" — the quiet half of the home page, under the hero.
 *
 * Deliberately still: the hero already spends this page's whole motion budget on
 * the particle flag, so nothing here moves, hovers or fades in. What carries it
 * instead is the grid — three steps stepping down and to the right across a
 * twelve-column field, each hanging under a hairline that starts in the brand
 * gradient and dissolves into the void. On a phone the staircase collapses into
 * one column and the rules keep the rhythm.
 *
 * Every word is interface copy, not model output: pressing a language in the
 * header retranslates it at once, with no agent turn. It therefore takes no
 * props and claims nothing this build cannot do — four languages, no account,
 * corrections while you speak, and the same practice available typed.
 */
import type { FC } from 'react';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  title: {
    id: 'how.title',
    defaultMessage: 'How it works',
    description: 'Heading of the section under the home hero explaining the three steps.',
  },
  step1Title: {
    id: 'how.step1.title',
    defaultMessage: 'Choose a language',
    description: 'Title of the first step: picking the language to practise.',
  },
  step1Body: {
    id: 'how.step1.body',
    defaultMessage:
      'Spanish, English, German or Russian. Press one on the screen — you can switch at any time, even in the middle of a conversation.',
    description: 'Body of the first step, naming the four practice languages.',
  },
  step2Title: {
    id: 'how.step2.title',
    defaultMessage: 'Press the microphone',
    description: 'Title of the second step: starting the live voice conversation.',
  },
  step2Body: {
    id: 'how.step2.body',
    defaultMessage:
      'Your browser asks for access once, and the conversation starts. No account, nothing to install.',
    description: 'Body of the second step, about the microphone prompt and starting to talk.',
  },
  step3Title: {
    id: 'how.step3.title',
    defaultMessage: 'Speak',
    description: 'Title of the third step: the conversation itself.',
  },
  step3Body: {
    id: 'how.step3.body',
    defaultMessage:
      'We answer in the language you are learning and repeat your sentences back correctly as we go. Cannot speak out loud right now? The same practice works typed.',
    description: 'Body of the third step, about answers, corrections and typed practice.',
  },
});

/**
 * The staircase. Every step must descend by the SAME horizontal distance, and
 * the last must still land flush with the column's right edge — which fixes the
 * arithmetic: with 12 columns, an even stride of 3 forces a 6-column measure
 * (starts 1 · 4 · 7, ends 6 · 9 · 12). An earlier 7-column measure could not
 * keep both promises and limped 3 columns, then 2.
 *
 * The tablet range keeps its own even stride of 2 over a wider 8-column measure
 * (starts 1 · 3 · 5, ends 8 · 10 · 12), because a 6-column measure there is too
 * narrow for body copy. Below `sm` these are inert and every step is full width.
 */
const STEP_PLACEMENT = [
  'sm:col-span-8 lg:col-span-6',
  'sm:col-span-8 sm:col-start-3 lg:col-span-6 lg:col-start-4',
  'sm:col-span-8 sm:col-start-5 lg:col-span-6 lg:col-start-7',
] as const;

/**
 * The gap above this section is a rhythm decision, not loose spacing. The owner
 * rejected a viewport-relative gap that pushed the section below the desktop
 * fold: half a screen of black read as a chasm, not as a pause. The measure is
 * the page's own smallest vertical interval — the ~96px between the header and
 * the top of the hero content — and this pause is about half again as much.
 *
 * The hero already contributes its own bottom padding (`lg:py-24`), so the
 * visible gap is that plus this margin: ~160px on a desktop window, ~112px on a
 * tablet, ~88px on a phone. Deliberately NOT viewport-relative: `vh` here made
 * the spacing a function of window height, which is what produced the chasm on
 * a tall screen in the first place.
 *
 * The desktop step is 64px rather than the 66px that a literal "10px lower"
 * would give, so the value stays on the design system's 4px grid; the 2px
 * difference is not visible, an off-grid one-off would be.
 */
const GAP_ABOVE = 'mt-12 lg:mt-16';

export const HowItWorks: FC = () => {
  const intl = useIntl();

  const steps = [
    { title: intl.formatMessage(messages.step1Title), body: intl.formatMessage(messages.step1Body) },
    { title: intl.formatMessage(messages.step2Title), body: intl.formatMessage(messages.step2Body) },
    { title: intl.formatMessage(messages.step3Title), body: intl.formatMessage(messages.step3Body) },
  ];

  return (
    <section aria-labelledby="how-it-works" className={`${GAP_ABOVE} pb-16 sm:pb-24`}>
      <h2
        id="how-it-works"
        className="text-balance text-[clamp(1.75rem,3.4vw,2.75rem)] font-normal leading-[1.1] tracking-tight text-foreground"
      >
        {intl.formatMessage(messages.title)}
      </h2>

      <ol className="mt-10 grid gap-y-10 sm:grid-cols-12 sm:gap-x-8 sm:gap-y-14">
        {steps.map((step, index) => (
          <li key={step.title} className={STEP_PLACEMENT[index]}>
            {/* The rule is the step's own baseline: brand at the numeral, gone by
                the far edge. A plain border cannot carry a gradient, so it is a
                1px element of its own. */}
            <div aria-hidden="true" className="learny-aqua-rule h-px w-full" />
            <div className="mt-5 flex items-baseline gap-5">
              <span className="flex-none font-extralight text-[2rem] leading-none tabular-nums text-foreground/25 sm:text-[2.5rem]">
                {intl.formatNumber(index + 1, { minimumIntegerDigits: 2 })}
              </span>
              <h3 className="min-w-0 text-xl font-normal tracking-tight text-foreground">
                {step.title}
              </h3>
            </div>
            <p className="mt-4 max-w-[42ch] text-[0.9375rem] font-extralight leading-relaxed text-foreground/60">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
};
