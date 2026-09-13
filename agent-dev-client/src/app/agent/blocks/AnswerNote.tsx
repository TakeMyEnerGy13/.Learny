/**
 * Where a typed answer lands.
 *
 * This page is the whole site, and in site mode the agent's reply text is not
 * shown anywhere once a screen is up — so without this note the line at the
 * bottom of the window could take a question and have nowhere to put the answer.
 * The agent re-sends the home screen with its `answer` prop filled, and the note
 * appears here, directly under the hero.
 *
 * Three things it has to get right:
 *
 * - **The visitor is usually not looking at it.** They typed from the bottom of
 *   the window, possibly with the plans on screen, so a note that quietly appears
 *   near the hero would be missed. It brings itself into view — the shell owns the
 *   scroll, so this asks politely with `scrollIntoView` rather than positioning
 *   anything itself, and it jumps instead of gliding when motion is reduced.
 * - **It must be dismissible.** The answer is a moment, not part of the page, so
 *   there is a close on it. Dismissal is remembered by TEXT, not by a flag: the
 *   same prop is still on the surface after a re-render, and a new answer differs
 *   from the dismissed one, so the next reply opens the note again by itself.
 * - **It is the agent's own words**, already written in the visitor's language.
 *   So it is rendered as-is, never wrapped in a message descriptor — only the
 *   chrome around it (the label, the close) is interface copy.
 * - **It is a dead end, and it now has a door.** One slot means the next answer
 *   overwrites this one, so a written exchange cannot happen here. The control at
 *   the foot of the note opens the writing desk, where the conversation is kept —
 *   a real dispatch, so the agent opens that page seeded with the language in
 *   play. It is deliberately quiet: an answer to "what does it cost" should not be
 *   followed by a loud invitation to go somewhere else.
 */
import { ArrowRight, X } from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { useSurfaceAction } from '@/app/lib/a2ui/surface-context.ts';

const messages = defineMessages({
  label: {
    id: 'answerNote.label',
    defaultMessage: 'Learny replies',
    description: 'Small caps label above an answer the agent wrote in response to a typed question.',
  },
  dismiss: {
    id: 'answerNote.dismiss',
    defaultMessage: 'Hide this answer',
    description: 'Accessible name of the close button on the answer note.',
  },
  toChat: {
    id: 'answerNote.toChat',
    defaultMessage: 'Go to the chat',
    description:
      'Control at the foot of the answer note that opens the written-practice page, where the whole exchange is kept.',
  },
});

export const AnswerNote: FC<{ text: string }> = ({ text }) => {
  const intl = useIntl();
  const dispatch = useSurfaceAction();
  const ref = useRef<HTMLDivElement | null>(null);
  const [dismissed, setDismissed] = useState('');

  const answer = text.trim();
  const visible = answer.length > 0 && answer !== dismissed;

  useEffect(() => {
    if (!visible) {
      return;
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
  }, [visible, answer]);

  if (!visible) {
    return null;
  }

  // Blank lines are paragraphs; single newlines are just wrapping in the model's
  // output and are not treated as breaks.
  const paragraphs = answer
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

  return (
    <div
      ref={ref}
      aria-live="polite"
      className="relative mt-2 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03] py-6 pl-7 pr-14 backdrop-blur-md"
    >
      {/* Struck down the left edge rather than across the top: the site uses the
          top hairline for a marked plan, and this is a different kind of object —
          something said, not something offered. */}
      <span aria-hidden="true" className="learny-aqua-rule absolute inset-y-0 left-0 w-px" />

      <p className="learny-aqua-text-sm text-[0.6875rem] font-semibold uppercase tracking-caps">
        {intl.formatMessage(messages.label)}
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {paragraphs.map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 24)}`}
            className="max-w-[62ch] text-[0.9375rem] font-extralight leading-relaxed text-foreground/85"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {/* The way out of a one-slot note: a text link rather than a filled button,
          because the answer above is the point and this is only an offer.

          The gradient is on the WORDS only — it is painted by clipping the
          background to the glyphs, which sets `color: transparent`, and a lucide
          icon strokes itself with `currentColor`. Put it on the row and the arrow
          disappears. */}
      <button
        type="button"
        onClick={() => dispatch?.('openWritingDesk', {})}
        className="group mt-4 inline-flex items-center gap-1.5 bg-transparent text-[0.8125rem] font-medium [touch-action:manipulation] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--learny-aqua-2))]"
      >
        <span className="learny-aqua-text-sm">{intl.formatMessage(messages.toChat)}</span>
        <ArrowRight
          aria-hidden="true"
          size={14}
          strokeWidth={1.75}
          className="text-[hsl(var(--learny-aqua-3))] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </button>

      <button
        type="button"
        onClick={() => setDismissed(answer)}
        aria-label={intl.formatMessage(messages.dismiss)}
        className="absolute right-4 top-5 grid size-8 place-items-center rounded-full text-muted-foreground-subtle transition-colors duration-300 [touch-action:manipulation] hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--learny-aqua-2))] motion-reduce:transition-none"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
};
