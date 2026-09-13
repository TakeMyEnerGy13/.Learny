/**
 * The one door from the landing page into the practice room.
 *
 * It sits directly after "How a conversation goes", because that is the moment
 * the visitor has just been told what practising feels like — and the answer to
 * "so let me try it" should be one press away, not a scroll back to the top.
 *
 * It is a real dispatch, not a link: the agent renders the room on its own
 * surface, seeded with the language already chosen, so nothing is lost crossing
 * over. Deliberately one control only — a second, quieter option here would just
 * be another decision to make in front of a door.
 */
import { ArrowRight } from 'lucide-react';
import type { FC } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { useSurfaceAction } from '@/app/lib/a2ui/surface-context.ts';

const messages = defineMessages({
  lead: {
    id: 'practiceCta.lead',
    defaultMessage: 'Enough reading.',
    description:
      'Short line above the button that leads into the practice room, placed after the section ' +
      'explaining how a conversation goes.',
  },
  button: {
    id: 'practiceCta.button',
    defaultMessage: 'Go to the practice room',
    description: 'The control that opens the focused practice page.',
  },
  note: {
    id: 'practiceCta.note',
    defaultMessage: 'No signup, no card. Just the conversation.',
    description: 'Quiet reassurance under the button that opens the practice page.',
  },
});

export const PracticeCta: FC = () => {
  const intl = useIntl();
  const dispatch = useSurfaceAction();

  return (
    <section className="flex flex-col items-center gap-5 py-20 text-center sm:py-24">
      <p className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
        {intl.formatMessage(messages.lead)}
      </p>

      <button
        type="button"
        onClick={() => dispatch?.('openPracticeRoom', {})}
        className="learny-aqua-fill group relative flex items-center gap-3 rounded-full px-10 py-5 text-[1.0625rem] font-medium tracking-tight transition-transform duration-200 ease-out [touch-action:manipulation] hover:scale-[1.03] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:scale-100 sm:px-12 sm:py-[1.375rem] sm:text-lg"
      >
        {intl.formatMessage(messages.button)}
        <ArrowRight
          aria-hidden="true"
          className="size-5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
          strokeWidth={1.75}
        />
      </button>

      <p className="text-xs font-extralight text-muted-foreground-subtle">
        {intl.formatMessage(messages.note)}
      </p>
    </section>
  );
};
