/**
 * The writing desk — the site's third page, and the only one that holds a
 * conversation.
 *
 * Why it exists (owner decision): a typed answer used to land in ONE slot on the
 * page, and the next answer overwrote it. Fine for "what does it cost", useless
 * for practising — writing practice is exactly the thing you need to scroll back
 * through, because the correction you got three lines ago is the lesson. So the
 * answer note grew a door, and this is the room behind it.
 *
 * Two design decisions worth keeping:
 *
 * - **The conversation is read, not passed.** `blocks/writing-thread.ts` derives
 *   it from the session's own messages, so nothing here can drift from what was
 *   actually said, and the agent answers in ordinary reply text. See that file for
 *   why a spoken turn never appears here.
 * - **No chat bubbles on both sides.** This canvas is black, hairline-ruled and
 *   quiet; two rows of grey blobs would look like any other chat window. Instead
 *   the site's own two materials carry the roles: the visitor's line sits on the
 *   PEARL they press to speak, ours stands on the aqua hairline used everywhere
 *   for what we say. A correction is a third, smaller register under the answer.
 *
 * The input is the line at the bottom of the window — the platform's composer,
 * which the owner deliberately kept. This page adds no second field.
 */
import { PenLine } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { type FC, useEffect, useRef } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import type { A2uiNodeViewProps } from '@/app/lib/a2ui/catalog.tsx';
import { useMessagingStore } from '@/app/lib/hooks';
import { useDismissBootCurtain } from '../blocks/boot-curtain.ts';
import { useRememberWritten } from '../blocks/learner.ts';
import { practiceBrief, practiceNotes } from '../blocks/practice-brief.ts';
import {
  LanguageRail,
  PEARL_SURFACE,
  useImmersionLocale,
  usePracticeLanguage,
  usePracticeNotes,
  usePublishedText,
  useRememberSpokenTime,
  useSilentVoiceOpen,
} from '../blocks/practice-voice.tsx';
import {
  buildWrittenThread,
  splitEmphasis,
  type WrittenTurn,
} from '../blocks/writing-thread.ts';

const messages = defineMessages({
  title: {
    id: 'desk.title',
    defaultMessage: 'Writing practice',
    description: 'Title of the page where the visitor practises the language in writing.',
  },
  languageLead: {
    id: 'desk.language.lead',
    defaultMessage: 'I write in',
    description:
      'Lead-in over the four practice languages on the writing page, phrased as the visitor’s own act.',
  },
  empty: {
    id: 'desk.empty',
    defaultMessage:
      'Write your first line in {language, select, spanish {Spanish} english {English} german {German} russian {Russian} other {the language you practise}} — I answer, and fix what needs fixing.',
    description:
      'Invitation on the writing page while nothing has been written yet. Names the practice language so the visitor knows which language to write in.',
  },
  you: {
    id: 'desk.you',
    defaultMessage: 'You',
    description: 'Small label over a line the visitor wrote in the written conversation.',
  },
  us: {
    id: 'desk.us',
    defaultMessage: 'Learny',
    description: 'Small label over an answer in the written conversation.',
  },
  correction: {
    id: 'desk.correction',
    defaultMessage: 'Fix',
    description: 'Small label on the one-line correction under a written answer.',
  },
  writing: {
    id: 'desk.writing',
    defaultMessage: 'Writing…',
    description: 'Shown in place of an answer while it is still being written.',
  },
  voiceFooter: {
    id: 'desk.voiceFooter',
    defaultMessage: 'Prefer to say it out loud? The header leads to the spoken conversation.',
    description:
      'Quiet footnote on the writing page pointing at the header control that leads to spoken practice.',
  },
});

const paragraphsOf = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

/**
 * The one piece of markdown this page honours, and only because of what it means
 * here: a model marks the word it CORRECTED. Printing the asterisks would waste
 * the most useful thing in the line. See `splitEmphasis`.
 */
const Emphasised: FC<{ text: string }> = ({ text }) => (
  <>
    {splitEmphasis(text).map((run, index) =>
      run.strong ? (
        <strong
          key={`${index}-${run.text.slice(0, 12)}`}
          className="font-medium text-foreground [text-decoration:underline_1px] [text-decoration-color:hsl(var(--learny-aqua-2)/0.7)] [text-underline-offset:0.22em]"
        >
          {run.text}
        </strong>
      ) : (
        <span key={`${index}-${run.text.slice(0, 12)}`}>{run.text}</span>
      ),
    )}
  </>
);

/** One line the visitor wrote, on the pearl they press to speak. */
const VisitorLine: FC<{ text: string }> = ({ text }) => {
  const intl = useIntl();

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="pr-1 text-[0.625rem] uppercase tracking-caps text-muted-foreground-subtle">
        {intl.formatMessage(messages.you)}
      </span>
      <div
        style={{ backgroundImage: PEARL_SURFACE }}
        className="max-w-[46ch] rounded-2xl rounded-br-md px-5 py-3 text-[0.9375rem] font-normal leading-relaxed text-[hsl(var(--pearl-ink))] shadow-[0_8px_30px_-14px_hsl(var(--pearl-2)/0.6)] ring-1 ring-foreground/20"
      >
        {paragraphsOf(text).map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 16)}`} className={index > 0 ? 'mt-2' : undefined}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
};

/** Our side: no plate at all, just the aqua hairline the site says things on. */
const AnswerLine: FC<{ turn: WrittenTurn }> = ({ turn }) => {
  const intl = useIntl();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="learny-aqua-text-sm pl-4 text-[0.625rem] font-semibold uppercase tracking-caps">
        {intl.formatMessage(messages.us)}
      </span>

      <div className="relative pl-4">
        <span aria-hidden="true" className="learny-aqua-rule absolute inset-y-0 left-0 w-px" />

        {turn.pending ? (
          <p
            className="flex items-center gap-2 text-[0.9375rem] font-extralight text-muted-foreground-subtle"
            aria-live="polite"
          >
            <span aria-hidden="true" className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-1 animate-pulse rounded-full bg-foreground/50 motion-reduce:animate-none"
                  style={{ animationDelay: `${dot * 180}ms` }}
                />
              ))}
            </span>
            {intl.formatMessage(messages.writing)}
          </p>
        ) : (
          <div className="flex max-w-[62ch] flex-col gap-2.5">
            {paragraphsOf(turn.answer).map((paragraph, index) => (
              <p
                key={`${index}-${paragraph.slice(0, 16)}`}
                className="text-[0.9375rem] font-extralight leading-relaxed text-foreground/90"
              >
                <Emphasised text={paragraph} />
              </p>
            ))}
          </div>
        )}

        {/* The correction is the reason this page exists, so it is not just more
            prose: its own register, small and marked, directly under the answer. */}
        {turn.correction ? (
          <div className="mt-3 flex max-w-[62ch] items-start gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-3.5 py-2.5">
            <PenLine
              size={13}
              strokeWidth={1.75}
              aria-hidden="true"
              className="mt-[0.2rem] flex-none text-[hsl(var(--learny-aqua-2))]"
            />
            <p className="text-[0.8125rem] font-extralight leading-relaxed text-foreground/75">
              <span className="mr-2 text-[0.625rem] uppercase tracking-caps text-muted-foreground-subtle">
                {intl.formatMessage(messages.correction)}
              </span>
              <Emphasised text={turn.correction} />
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const WritingDeskComponent: FC<A2uiNodeViewProps> = ({ node }) => {
  const intl = useIntl();
  const store = useMessagingStore();
  const { practice, selectLanguage } = usePracticeLanguage(node.props.initialPracticeLanguage);
  const endRef = useRef<HTMLDivElement | null>(null);

  // The desk is the written channel, but the microphone in the input bar is still
  // there — so keep the voice channel's own inputs current rather than letting a
  // call opened from this page inherit whatever the last screen published.
  usePublishedText(
    '/practice/brief',
    practiceBrief({
      language: practice,
      mode: 'free',
      scenario: 'cafe',
      pace: 'normal',
      uiLocale: intl.locale,
    }),
  );
  usePracticeNotes(
    practiceNotes({ language: practice, mode: 'free', scenario: 'cafe', pace: 'normal' }),
  );
  useImmersionLocale(practice);
  useSilentVoiceOpen();
  // The microphone in the input bar works from this page as well.
  useRememberSpokenTime(practice);
  useDismissBootCurtain();

  // The thread is the session itself, narrowed to the run that opened this desk —
  // questions asked on the landing page are not the start of a practice
  // conversation. `responseId` can be missing on a resynced surface, and then the
  // projection simply keeps every written turn.
  const deskRun = store.a2uiSurfaces.surfaces.get('writing')?.responseId ?? null;
  const thread = buildWrittenThread({
    messages: store.messages,
    pending: store.userRequestPending,
    fromResponseId: deskRun,
  });

  // Every finished exchange goes into what we remember about this learner: one
  // written turn, and the correction as a mistake we have now seen. The desk has
  // already separated the correction out of the reply, so this is the one place on
  // the site that knows a specific slip without asking the model for it.
  useRememberWritten(thread, practice);

  // A conversation grows downwards, so the newest line is the one to be looking
  // at. The shell owns the scroll; this only asks.
  const lastId = thread.length > 0 ? `${thread[thread.length - 1]?.id}:${thread.length}` : '';
  useEffect(() => {
    if (!lastId) {
      return;
    }
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    endRef.current?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'end' });
  }, [lastId]);

  return (
    <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-6 py-2">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-[1.375rem] font-normal tracking-tight text-foreground/90">
          {intl.formatMessage(messages.title)}
        </h1>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
            {intl.formatMessage(messages.languageLead)}
          </span>
          <LanguageRail practice={practice} onSelect={selectLanguage} />
        </div>
      </div>

      <div className="flex min-h-[40dvh] flex-col gap-7 border-t border-foreground/10 pt-7">
        {thread.length === 0 ? (
          <p className="mx-auto max-w-[40ch] py-10 text-center text-[0.9375rem] font-extralight leading-relaxed text-muted-foreground-subtle">
            {intl.formatMessage(messages.empty, { language: practice })}
          </p>
        ) : (
          thread.map((turn) => (
            <div key={turn.id} className="flex flex-col gap-4">
              {turn.request ? <VisitorLine text={turn.request} /> : null}
              {turn.answer || turn.pending || turn.correction ? <AnswerLine turn={turn} /> : null}
            </div>
          ))
        )}
        <div ref={endRef} aria-hidden="true" />
      </div>

      <p className="text-center text-[0.6875rem] font-extralight leading-relaxed text-muted-foreground-subtle">
        {intl.formatMessage(messages.voiceFooter)}
      </p>
    </div>
  );
};

export const WritingDesk = observer(WritingDeskComponent);
