/**
 * Third section: how a spoken conversation with Learny actually works.
 *
 * Owner decision: the four mechanics zigzag down the page — left, then right and
 * lower, then left again — and a trail of fireflies walks them in step with the
 * scroll, lighting each one as it arrives. The scroll is the animation: the
 * reader's own movement drives it, and nothing runs while the page is still. See
 * `FireflyTrail` for the path and the swarm.
 *
 * Hovering a step lights it early, which is the same treatment reached by
 * scrolling: the pointer is an accelerator here, never the only way in. Every
 * step is fully readable untouched, so a phone without a pointer loses nothing.
 *
 * The particle strip above carries the section's own motion. Every claim here
 * describes what this build does — a live stream instead of recorded messages,
 * interruption, corrections inside the reply, and ending or continuing typed.
 * Nothing about accounts, levels, courses or streaks, because none exist.
 */
import { type FC, useCallback, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { decorateHeadline } from './decorateHeadline.tsx';
import { FireflyTrail } from './FireflyTrail.tsx';
import { PhraseParticles } from './PhraseParticles.tsx';

const messages = defineMessages({
  title: {
    id: 'mechanics.title',
    defaultMessage: 'What a conversation is like',
    description: 'Heading of the third home section, which explains how the voice conversation works.',
  },
  titleScriptWord: {
    id: 'mechanics.title.scriptWord',
    defaultMessage: 'conversation',
    description:
      'ONE word from mechanics.title, in the exact form it appears there, to be set in the decorative script. Must be a literal substring of the translated heading, or the accent is skipped.',
  },
  lead: {
    id: 'mechanics.lead',
    defaultMessage:
      'No lesson, no script. You press once and talk — everything here happens inside that one conversation.',
    description: 'Single supporting line under the third section heading.',
  },
  streamLabel: {
    id: 'mechanics.stream.label',
    defaultMessage: 'A live stream, not messages',
    description: 'Title of the step about the realtime connection.',
  },
  streamBody: {
    id: 'mechanics.stream.body',
    defaultMessage:
      'Your voice goes straight through as you speak, so the answer comes back in the rhythm of a phone call — there is nothing to record, send and wait for.',
    description: 'Explanation of the step about the realtime connection.',
  },
  interruptLabel: {
    id: 'mechanics.interrupt.label',
    defaultMessage: 'Interrupt freely',
    description: 'Title of the step about interrupting the assistant.',
  },
  interruptBody: {
    id: 'mechanics.interrupt.body',
    defaultMessage:
      'Talk over the answer whenever it goes the wrong way. It stops listening to itself and picks up what you just said.',
    description: 'Explanation of the step about interrupting the assistant.',
  },
  fixLabel: {
    id: 'mechanics.fix.label',
    defaultMessage: 'Corrections as you go',
    description: 'Title of the step about corrections.',
  },
  fixBody: {
    id: 'mechanics.fix.body',
    defaultMessage:
      'A wrong ending or word order comes back to you said correctly, inside the reply, and the conversation carries on. You are never marked or scored.',
    description: 'Explanation of the step about corrections.',
  },
  closeLabel: {
    id: 'mechanics.close.label',
    defaultMessage: 'Stop, or keep going in writing',
    description: 'Title of the step about ending the call or typing instead.',
  },
  closeBody: {
    id: 'mechanics.close.body',
    defaultMessage:
      'End the call with the button beside the microphone. Somewhere you cannot speak out loud? The same conversation works typed, in the line at the bottom.',
    description: 'Explanation of the step about ending the call or typing instead.',
  },
});

/**
 * Zigzag, not a staircase: left, then right and lower, then left and lower again.
 * Owner decision — the steps read as a walk from side to side rather than as a
 * second flight of stairs after "How it works".
 *
 * Each step owns its own grid row, otherwise a left and a right step would share
 * one (they fit side by side) and the zigzag would collapse into two rows of
 * pairs. Desktop uses a 5-column measure on columns 1 and 8, leaving the middle
 * two columns as the channel the firefly trail travels down. The tablet range
 * overlaps its halves (8 columns starting at 1 and 5) because 5 of 12 is too
 * narrow for body copy there. Below `sm` every step is full width and the trail
 * runs straight down.
 */
const STEP_PLACEMENT = [
  'sm:col-span-8 sm:col-start-1 sm:row-start-1 lg:col-span-5 lg:col-start-1 lg:row-start-1',
  'sm:col-span-8 sm:col-start-5 sm:row-start-2 lg:col-span-5 lg:col-start-8 lg:row-start-2',
  'sm:col-span-8 sm:col-start-1 sm:row-start-3 lg:col-span-5 lg:col-start-1 lg:row-start-3',
  'sm:col-span-8 sm:col-start-5 sm:row-start-4 lg:col-span-5 lg:col-start-8 lg:row-start-4',
] as const;

export const VoiceMechanics: FC = () => {
  const intl = useIntl();
  const gridRef = useRef<HTMLOListElement | null>(null);
  const anchorsRef = useRef<Array<HTMLElement | null>>([]);
  /** How far the fireflies have walked: steps up to here are lit. */
  const [reached, setReached] = useState(-1);
  const onReach = useCallback((index: number) => setReached(index), []);

  const steps = [
    { title: intl.formatMessage(messages.streamLabel), body: intl.formatMessage(messages.streamBody) },
    {
      title: intl.formatMessage(messages.interruptLabel),
      body: intl.formatMessage(messages.interruptBody),
    },
    { title: intl.formatMessage(messages.fixLabel), body: intl.formatMessage(messages.fixBody) },
    { title: intl.formatMessage(messages.closeLabel), body: intl.formatMessage(messages.closeBody) },
  ];

  return (
    <section aria-labelledby="voice-mechanics" className="mt-16 lg:mt-24">
      <PhraseParticles />

      <div className="mt-10 flex flex-col items-center gap-4 text-center lg:mt-14">
        <h2
          id="voice-mechanics"
          className="text-balance text-[clamp(1.75rem,3.4vw,2.75rem)] font-normal leading-[1.15] tracking-tight text-foreground"
        >
          {decorateHeadline(
            intl.formatMessage(messages.title),
            intl.formatMessage(messages.titleScriptWord),
          )}
        </h2>
        <p className="max-w-[52ch] text-[0.9375rem] font-extralight leading-relaxed text-foreground/60">
          {intl.formatMessage(messages.lead)}
        </p>
      </div>

      <div className="relative mt-12 lg:mt-16">
        <FireflyTrail container={gridRef} anchors={anchorsRef} onReach={onReach} />

        <ol
          ref={gridRef}
          className="relative grid gap-y-12 sm:grid-cols-12 sm:gap-x-8 sm:gap-y-16 lg:gap-y-20"
        >
          {steps.map((step, index) => {
            const lit = index <= reached;
            return (
              <li key={step.title} className={`group ${STEP_PLACEMENT[index]}`}>
                {/* The step's baseline, in two layers: the standing gradient
                    hairline, and a brighter one that draws itself when the
                    fireflies arrive — or under the pointer, whichever comes
                    first. Two elements because a gradient cannot live on a
                    border, and the wipe needs its own transform. */}
                <div aria-hidden="true" className="relative h-px w-full">
                  <div className="learny-aqua-rule absolute inset-0" />
                  <div
                    className={`learny-mechanic-wipe absolute inset-0 origin-left transition-[transform,opacity] duration-700 ease-out group-hover:scale-x-100 group-hover:opacity-100 motion-reduce:transition-none ${
                      lit ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                    }`}
                  />
                </div>

                <div className="mt-5 flex items-baseline gap-5">
                  <span
                    ref={(element) => {
                      anchorsRef.current[index] = element;
                    }}
                    className={`flex-none text-[2rem] font-extralight leading-none tabular-nums transition-colors duration-700 group-hover:text-[hsl(194,96%,70%)]/70 motion-reduce:transition-none sm:text-[2.5rem] ${
                      lit ? 'text-[hsl(194,96%,70%)]/60' : 'text-foreground/25'
                    }`}
                  >
                    {intl.formatNumber(index + 1, { minimumIntegerDigits: 2 })}
                  </span>
                  <h3 className="min-w-0 text-xl font-normal tracking-tight text-foreground">
                    {step.title}
                  </h3>
                </div>

                <p
                  className={`mt-4 max-w-[42ch] text-[0.9375rem] font-extralight leading-relaxed transition-colors duration-700 group-hover:text-foreground/85 motion-reduce:transition-none ${
                    lit ? 'text-foreground/80' : 'text-foreground/55'
                  }`}
                >
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};
