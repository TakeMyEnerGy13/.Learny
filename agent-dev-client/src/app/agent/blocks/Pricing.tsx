/**
 * Fourth section: the three plans.
 *
 * Restrained on purpose, per the owner: no bright colours, no badges shouting
 * "BEST VALUE", no animation beyond the same one-pixel lift the hero's qualifier
 * plates use under the pointer. What carries it is type and air — the tier names
 * in the decorative script, prices set large and light, and benefit lines quiet
 * enough to read in one pass. The middle plan is marked by a single gradient
 * hairline across its top and a small caps label, nothing louder.
 *
 * HONESTY: payment is not connected in this build, so only the free plan has a
 * working action — it takes the visitor back to the microphone, which is real.
 * The paid plans read "soon" rather than pretending to a checkout that does not
 * exist, and the footnote says so plainly. The prices and benefits are the
 * owner's to set; they live in interface copy, so changing one is a copy edit and
 * costs no agent turn.
 */
import { Check } from 'lucide-react';
import type { FC } from 'react';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  title: {
    id: 'pricing.title',
    defaultMessage: 'Plans',
    description: 'Heading of the pricing section, which shows the three subscription tiers.',
  },
  lead: {
    id: 'pricing.lead',
    defaultMessage: 'Speaking practice by the minute. Start free — no card, no account.',
    description: 'Single supporting line under the pricing heading.',
  },
  perMonth: {
    id: 'pricing.perMonth',
    defaultMessage: 'per month',
    description: 'Billing period shown next to a plan price.',
  },
  recommended: {
    id: 'pricing.recommended',
    defaultMessage: 'Most chosen',
    description: 'Quiet label above the middle plan. Keep it short and understated.',
  },
  free: {
    id: 'pricing.free',
    defaultMessage: 'Free',
    description: 'Price of the trial plan, shown instead of an amount.',
  },
  startFree: {
    id: 'pricing.action.startFree',
    defaultMessage: 'Start speaking',
    description: 'Action on the free plan; it takes the visitor back up to the microphone.',
  },
  soon: {
    id: 'pricing.action.soon',
    defaultMessage: 'Soon',
    description: 'Action label on the paid plans, which cannot be bought in this demo yet.',
  },

  trialName: {
    id: 'pricing.trial.name',
    defaultMessage: 'Taste',
    description:
      'Name of the free plan, set in the decorative script. One short word — a long name breaks the line.',
  },
  trialNote: {
    id: 'pricing.trial.note',
    defaultMessage: 'To hear what a conversation feels like.',
    description: 'One line under the free plan name.',
  },
  trialPoint1: {
    id: 'pricing.trial.point1',
    defaultMessage: '10 minutes of speaking a month',
    description: 'Benefit of the free plan: its monthly voice allowance.',
  },
  trialPoint2: {
    id: 'pricing.trial.point2',
    defaultMessage: 'All four languages',
    description: 'Benefit of the free plan: the four practice languages.',
  },
  trialPoint3: {
    id: 'pricing.trial.point3',
    defaultMessage: 'Corrections while you speak',
    description: 'Benefit of the free plan: corrections during the conversation.',
  },
  trialPoint4: {
    id: 'pricing.trial.point4',
    defaultMessage: 'No account, no card',
    description: 'Benefit of the free plan: nothing to sign up for.',
  },

  practiceName: {
    id: 'pricing.practice.name',
    defaultMessage: 'Practice',
    description:
      'Name of the middle plan, set in the decorative script. One short word — a long name breaks the line.',
  },
  practiceNote: {
    id: 'pricing.practice.note',
    defaultMessage: 'For a conversation a few times a week.',
    description: 'One line under the middle plan name.',
  },
  practicePoint1: {
    id: 'pricing.practice.point1',
    defaultMessage: '120 minutes of speaking a month',
    description: 'Benefit of the middle plan: its monthly voice allowance.',
  },
  practicePoint2: {
    id: 'pricing.practice.point2',
    defaultMessage: 'Conversations up to 30 minutes',
    description: 'Benefit of the middle plan: the length of a single conversation.',
  },
  practicePoint3: {
    id: 'pricing.practice.point3',
    defaultMessage: 'Switch language mid-conversation',
    description: 'Benefit of the middle plan: changing the practice language while talking.',
  },
  practicePoint4: {
    id: 'pricing.practice.point4',
    defaultMessage: 'Written practice without a limit',
    description: 'Benefit of the middle plan: typed practice is not metered.',
  },

  fluencyName: {
    id: 'pricing.fluency.name',
    defaultMessage: 'Fluency',
    description:
      'Name of the top plan, set in the decorative script. One short word — a long name breaks the line.',
  },
  fluencyNote: {
    id: 'pricing.fluency.note',
    defaultMessage: 'For speaking every day.',
    description: 'One line under the top plan name.',
  },
  fluencyPoint1: {
    id: 'pricing.fluency.point1',
    defaultMessage: '500 minutes of speaking a month',
    description: 'Benefit of the top plan: its monthly voice allowance.',
  },
  fluencyPoint2: {
    id: 'pricing.fluency.point2',
    defaultMessage: 'Conversations of any length',
    description: 'Benefit of the top plan: no cap on a single conversation.',
  },
  fluencyPoint3: {
    id: 'pricing.fluency.point3',
    defaultMessage: 'Everything in Practice',
    description: 'Benefit of the top plan: it contains the middle plan.',
  },
  fluencyPoint4: {
    id: 'pricing.fluency.point4',
    defaultMessage: 'Several languages side by side',
    description: 'Benefit of the top plan: practising more than one language in parallel.',
  },

  note: {
    id: 'pricing.note',
    defaultMessage:
      'The demo is free and capped at a few minutes of speaking. Paid plans are not connected yet — nothing here charges anything.',
    description:
      'Honest footnote under the plans. It must keep saying that no payment is possible in this build.',
  },
});

/** Prices in euros. Amounts, not strings, so every locale formats its own way. */
const PRACTICE_PRICE = 9;
const FLUENCY_PRICE = 19;

export const Pricing: FC = () => {
  const intl = useIntl();

  const price = (amount: number) =>
    intl.formatNumber(amount, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    });

  const plans = [
    {
      id: 'trial',
      name: intl.formatMessage(messages.trialName),
      note: intl.formatMessage(messages.trialNote),
      price: intl.formatMessage(messages.free),
      period: null,
      points: [
        intl.formatMessage(messages.trialPoint1),
        intl.formatMessage(messages.trialPoint2),
        intl.formatMessage(messages.trialPoint3),
        intl.formatMessage(messages.trialPoint4),
      ],
      featured: false,
      available: true,
    },
    {
      id: 'practice',
      name: intl.formatMessage(messages.practiceName),
      note: intl.formatMessage(messages.practiceNote),
      price: price(PRACTICE_PRICE),
      period: intl.formatMessage(messages.perMonth),
      points: [
        intl.formatMessage(messages.practicePoint1),
        intl.formatMessage(messages.practicePoint2),
        intl.formatMessage(messages.practicePoint3),
        intl.formatMessage(messages.practicePoint4),
      ],
      featured: true,
      available: false,
    },
    {
      id: 'fluency',
      name: intl.formatMessage(messages.fluencyName),
      note: intl.formatMessage(messages.fluencyNote),
      price: price(FLUENCY_PRICE),
      period: intl.formatMessage(messages.perMonth),
      points: [
        intl.formatMessage(messages.fluencyPoint1),
        intl.formatMessage(messages.fluencyPoint2),
        intl.formatMessage(messages.fluencyPoint3),
        intl.formatMessage(messages.fluencyPoint4),
      ],
      featured: false,
      available: false,
    },
  ];

  return (
    <section aria-labelledby="pricing" className="mt-24 lg:mt-32">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2
          id="pricing"
          className="text-balance text-[clamp(1.75rem,3.4vw,2.75rem)] font-normal leading-[1.15] tracking-tight text-foreground"
        >
          {intl.formatMessage(messages.title)}
        </h2>
        <p className="max-w-[46ch] text-[0.9375rem] font-extralight leading-relaxed text-foreground/60">
          {intl.formatMessage(messages.lead)}
        </p>
      </div>

      {/* Three across only from `lg`: at the tablet width three of these cards
          leave about 180px of measure each, which crushes the benefit lines into
          three-word ribbons. Below that they stack, which reads calmer anyway. */}
      <ul className="mt-12 grid gap-4 sm:gap-5 lg:mt-16 lg:grid-cols-3 lg:gap-6">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border p-7 backdrop-blur-md transition-[transform,border-color,background-color] duration-500 ease-out hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:p-8 ${
              plan.featured
                ? 'border-foreground/[0.14] bg-foreground/[0.045] shadow-[inset_0_1px_0_hsl(var(--foreground)/0.12)] hover:border-[hsl(var(--learny-aqua-1)/0.4)]'
                : 'border-foreground/[0.08] bg-foreground/[0.02] hover:border-foreground/20'
            }`}
          >
            {/* The only mark the middle plan gets: the site's own gradient
                hairline across its top edge. No badge, no colour fill. */}
            {plan.featured ? (
              <span aria-hidden="true" className="learny-aqua-rule absolute inset-x-0 top-0 h-px" />
            ) : null}

            <p className="h-4 text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground-subtle">
              {plan.featured ? intl.formatMessage(messages.recommended) : ''}
            </p>

            <h3 className="mt-5 text-[2rem] font-normal leading-none text-foreground">
              <span className="learny-script">{plan.name}</span>
            </h3>
            {/* Two lines of room whether the note needs them or not, so the three
                prices sit on one line across the row. */}
            <p className="mt-4 min-h-[2.5rem] text-[0.8125rem] font-extralight leading-relaxed text-foreground/50">
              {plan.note}
            </p>

            <p className="mt-7 flex items-baseline gap-2">
              <span className="text-[2.25rem] font-extralight leading-none tracking-tight text-foreground">
                {plan.price}
              </span>
              {plan.period ? (
                <span className="text-xs font-extralight text-muted-foreground-subtle">
                  {plan.period}
                </span>
              ) : null}
            </p>

            <span aria-hidden="true" className="mt-7 h-px w-full bg-foreground/[0.08]" />

            <ul className="mt-6 flex flex-col gap-3">
              {plan.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Check
                    aria-hidden="true"
                    className="mt-[0.2rem] size-3.5 flex-none text-[hsl(var(--learny-aqua-2))]/50"
                    strokeWidth={1.5}
                  />
                  <span className="text-[0.875rem] font-extralight leading-relaxed text-foreground/70">
                    {point}
                  </span>
                </li>
              ))}
            </ul>

            {/* The action sits at the bottom of every card regardless of how many
                benefit lines a plan has, so the three buttons line up. */}
            <div className="mt-8 flex flex-1 items-end">
              {plan.available ? (
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="w-full rounded-xl border border-foreground/15 bg-foreground/[0.04] px-4 py-3 text-sm font-normal text-foreground/90 transition-colors duration-300 hover:border-[hsl(var(--learny-aqua-1)/0.45)] hover:bg-foreground/[0.07] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--learny-aqua-2))] motion-reduce:transition-none"
                >
                  {intl.formatMessage(messages.startFree)}
                </button>
              ) : (
                <p className="w-full rounded-xl border border-dashed border-foreground/12 px-4 py-3 text-center text-sm font-extralight text-muted-foreground-subtle">
                  {intl.formatMessage(messages.soon)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-[64ch] text-xs font-extralight leading-relaxed text-muted-foreground-subtle">
        {intl.formatMessage(messages.note)}
      </p>
    </section>
  );
};
