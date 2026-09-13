/**
 * The progress page: what Learny remembers about this learner, shown to them.
 *
 * Owner decision. The site claims to remember a student between visits, and a claim
 * like that has to be inspectable — otherwise "we remember you" is just a warmer way
 * of saying nothing. So this page lays the profile out plainly: the language, our
 * estimate of the level, the time actually spoken, the lines written, the scenes
 * played, and every mistake we keep seeing with how often we have seen it.
 *
 * Three rules it follows, all of them the reason it looks the way it does:
 *
 * - **Nothing here is passed by the model.** The component reads the profile over
 *   tRPC (`useLearnerProfile`). A number that travels through a paraphrase is not a
 *   number any more, and the agent has no business retyping "47 minutes".
 * - **It never implies an account.** The footnote says out loud that the memory
 *   lives in this browser, and the erase control is on the page, not hidden behind a
 *   request to us. A demo nobody can reset is a demo nobody trusts.
 * - **The level is an estimate.** Labelled as one, with the agent's own one-line
 *   reason under it when there is one. No score, no percentage, no certificate.
 *
 * The one press that costs an agent turn is "practise these" — the page cannot open
 * a practice room by itself, and that room is the whole point of keeping a list of
 * mistakes in the first place.
 */
import { Eraser, Mic } from 'lucide-react';
import { type FC, useContext, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import type { A2uiNodeViewProps } from '@/app/lib/a2ui/catalog.tsx';
import { A2uiSurfaceContext } from '@/app/lib/a2ui/surface-context.ts';
import { useDismissBootCurtain } from '../blocks/boot-curtain.ts';
import { forgetLearner, relativeDays, useLearnerProfile } from '../blocks/learner.ts';
import { type PracticeScenario, useScenarioLabels } from '../blocks/PracticeModes.tsx';

const messages = defineMessages({
  title: {
    id: 'progress.title',
    defaultMessage: 'What we remember',
    description: 'Title of the page that shows the learner their own remembered profile.',
  },
  lead: {
    id: 'progress.lead',
    defaultMessage: 'Everything Learny knows about your practice — and nothing else.',
    description: 'One line under the progress page title, promising the list is complete.',
  },
  languageName: {
    id: 'progress.value.language',
    defaultMessage:
      '{language, select, spanish {Spanish} english {English} german {German} russian {Russian} other {}}',
    description:
      'Name of the practice language as the VALUE of a fact — a plain name on its own, not inside a ' +
      'sentence, so it must be the dictionary form in languages that inflect.',
  },
  languageLabel: {
    id: 'progress.fact.language',
    defaultMessage: 'Practising',
    description: 'Label of the fact showing which language the learner practises.',
  },
  levelLabel: {
    id: 'progress.fact.level',
    defaultMessage: 'Level, our estimate',
    description:
      'Label of the fact showing the level. Must read as an estimate, never as a test result.',
  },
  levelUnknown: {
    id: 'progress.fact.level.unknown',
    defaultMessage: 'Not estimated yet',
    description: 'Value shown in place of a level while we have not judged one.',
  },
  spokenLabel: {
    id: 'progress.fact.spoken',
    defaultMessage: 'Spoken',
    description: 'Label of the fact showing how long the learner has spoken with us.',
  },
  minutes: {
    id: 'progress.value.minutes',
    defaultMessage: '{minutes, plural, one {# minute} other {# minutes}}',
    description: 'A duration in whole minutes, as shown on the progress page.',
  },
  writtenLabel: {
    id: 'progress.fact.written',
    defaultMessage: 'Written',
    description: 'Label of the fact showing how many lines the learner has written.',
  },
  lines: {
    id: 'progress.value.lines',
    defaultMessage: '{count, plural, one {# line} other {# lines}}',
    description: 'A count of written lines, as shown on the progress page.',
  },
  visitsLabel: {
    id: 'progress.fact.visits',
    defaultMessage: 'Visits',
    description: 'Label of the fact showing how many times the learner has come back.',
  },
  visits: {
    id: 'progress.value.visits',
    defaultMessage: '{count, plural, one {# visit} other {# visits}}',
    description: 'A count of visits, as shown on the progress page.',
  },
  lastSeenLabel: {
    id: 'progress.fact.lastSeen',
    defaultMessage: 'Last time',
    description: 'Label of the fact showing when the learner was here before.',
  },
  scenesLabel: {
    id: 'progress.fact.scenes',
    defaultMessage: 'Scenes played',
    description: 'Label of the fact listing the role-play scenes the learner has tried.',
  },
  mistakesTitle: {
    id: 'progress.mistakes.title',
    defaultMessage: 'Corrections we have kept',
    description: 'Heading over the list of the learner’s recorded mistakes.',
  },
  mistakesLead: {
    id: 'progress.mistakes.lead',
    defaultMessage:
      'Every fix the writing desk showed you. The ones that came back more than once are worth a ' +
      'conversation.',
    description: 'One line under the mistakes heading explaining what the list is.',
  },
  seenTimes: {
    id: 'progress.mistakes.seen',
    defaultMessage: '{count, plural, one {seen once} other {seen # times}}',
    description:
      'How often one mistake has been seen, shown beside it. Only ever rendered for a mistake seen ' +
      'more than once.',
  },
  practise: {
    id: 'progress.practise',
    defaultMessage: 'Practise these out loud',
    description:
      'Main control: opens a spoken conversation aimed at the recurring mistakes on this page.',
  },
  empty: {
    id: 'progress.empty',
    defaultMessage: 'Nothing yet — speak or write a few lines and this page fills itself in.',
    description: 'Shown instead of the facts when we have not learned anything about the visitor.',
  },
  cleanTitle: {
    id: 'progress.mistakes.clean',
    defaultMessage: 'Nothing has needed correcting yet.',
    description: 'Shown in place of the mistake list when no correction has been recorded.',
  },
  forget: {
    id: 'progress.forget',
    defaultMessage: 'Forget everything',
    description: 'Control that erases the whole remembered profile.',
  },
  forgotten: {
    id: 'progress.forgotten',
    defaultMessage: 'Erased. Nothing about you is stored any more.',
    description: 'Confirmation shown after the learner erased their profile.',
  },
  boundToBrowser: {
    id: 'learner.boundToBrowser',
    defaultMessage: 'Remembered in this browser, without an account.',
    description:
      'Honest footnote wherever remembered facts are shown: there is no login, so the memory ' +
      'belongs to this browser and does not follow the learner to another device.',
  },
});

/** One fact: a quiet label with the value under it, in the site's own register. */
const Fact: FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <div className="flex flex-col gap-1.5 border-t border-foreground/10 pt-4">
    <span className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
      {label}
    </span>
    <span className="text-[1.0625rem] font-light text-foreground/90">{value}</span>
    {note ? (
      <span className="text-[0.8125rem] font-extralight leading-relaxed text-foreground/50">
        {note}
      </span>
    ) : null}
  </div>
);

const LearnerProgressComponent: FC<A2uiNodeViewProps> = () => {
  const intl = useIntl();
  const surface = useContext(A2uiSurfaceContext);
  const sceneLabels = useScenarioLabels();
  const [erased, setErased] = useState(0);
  const [pending, setPending] = useState(false);
  const { profile, ready } = useLearnerProfile(erased);

  // A reload replays the session, so this page can be the first one to mount — and
  // it holds the curtain until the profile is in, because a page of facts that
  // appears empty and then fills in reads as a page that lost them.
  useDismissBootCurtain(ready);

  // Every correction we hold, repeats first: a page about memory that hides two
  // thirds of what it remembers is not the honest page it claims to be. The COUNT
  // is what separates a standing problem from a one-off slip, so it is shown only
  // where it means something.
  const mistakes = [...(profile?.mistakes ?? [])].sort((a, b) => b.count - a.count);
  const recurring = mistakes.filter((mistake) => mistake.count > 1);
  const known =
    !!profile &&
    (!!profile.language ||
      profile.spokenSeconds > 0 ||
      profile.writtenTurns > 0 ||
      profile.mistakes.length > 0);
  const minutes = Math.round((profile?.spokenSeconds ?? 0) / 60);
  const lastSeen = relativeDays(profile?.lastSeenAt ?? null, intl.locale);

  const practise = () => {
    if (pending || !profile?.language) {
      return;
    }
    setPending(true);
    surface?.dispatch('practiseMistakes', {
      language: profile.language,
      // Repeats first, then the rest: what to drill is the standing problem, and a
      // learner with no repeat yet still deserves their last corrections used.
      focus: (recurring.length > 0 ? recurring : mistakes)
        .slice(0, 3)
        .map((mistake) => mistake.text)
        .join(' · '),
    });
  };

  const erase = () => {
    forgetLearner();
    setErased((count) => count + 1);
  };

  return (
    <div className="mx-auto flex w-full max-w-[38rem] flex-col gap-8 py-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-[1.375rem] font-normal tracking-tight text-foreground/90">
          {intl.formatMessage(messages.title)}
        </h1>
        <p className="max-w-[42ch] text-[0.9375rem] font-extralight leading-relaxed text-foreground/55">
          {intl.formatMessage(messages.lead)}
        </p>
      </div>

      {!known ? (
        <p className="mx-auto max-w-[40ch] py-8 text-center text-[0.9375rem] font-extralight leading-relaxed text-muted-foreground-subtle">
          {intl.formatMessage(erased > 0 ? messages.forgotten : messages.empty)}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {profile?.language ? (
              <Fact
                label={intl.formatMessage(messages.languageLabel)}
                value={intl.formatMessage(messages.languageName, { language: profile.language })}
              />
            ) : null}
            <Fact
              label={intl.formatMessage(messages.levelLabel)}
              value={
                profile?.level?.code ?? intl.formatMessage(messages.levelUnknown)
              }
              note={profile?.level?.note || undefined}
            />
            {minutes > 0 ? (
              <Fact
                label={intl.formatMessage(messages.spokenLabel)}
                value={intl.formatMessage(messages.minutes, { minutes })}
              />
            ) : null}
            {profile && profile.writtenTurns > 0 ? (
              <Fact
                label={intl.formatMessage(messages.writtenLabel)}
                value={intl.formatMessage(messages.lines, { count: profile.writtenTurns })}
              />
            ) : null}
            {profile && profile.visits > 0 ? (
              <Fact
                label={intl.formatMessage(messages.visitsLabel)}
                value={intl.formatMessage(messages.visits, { count: profile.visits })}
                note={
                  lastSeen
                    ? `${intl.formatMessage(messages.lastSeenLabel)}: ${lastSeen}`
                    : undefined
                }
              />
            ) : null}
            {profile && profile.scenes.length > 0 ? (
              <Fact
                label={intl.formatMessage(messages.scenesLabel)}
                value={profile.scenes
                  .map((scene) => sceneLabels[scene as PracticeScenario] ?? scene)
                  .filter(Boolean)
                  .join(', ')}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-4 border-t border-foreground/10 pt-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[1rem] font-normal text-foreground/85">
                {intl.formatMessage(messages.mistakesTitle)}
              </h2>
              <p className="text-[0.8125rem] font-extralight leading-relaxed text-muted-foreground-subtle">
                {intl.formatMessage(messages.mistakesLead)}
              </p>
            </div>

            {mistakes.length === 0 ? (
              <p className="text-[0.9375rem] font-extralight text-foreground/50">
                {intl.formatMessage(messages.cleanTitle)}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {mistakes.map((mistake) => (
                  <li
                    key={mistake.text}
                    className="flex flex-col gap-1 border-l border-[hsl(var(--learny-aqua-2)/0.45)] pl-4"
                  >
                    <span className="text-[0.9375rem] font-extralight leading-relaxed text-foreground/85">
                      {mistake.text}
                    </span>
                    {mistake.count > 1 ? (
                      <span className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
                        {intl.formatMessage(messages.seenTimes, { count: mistake.count })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {mistakes.length > 0 && profile?.language ? (
              <button
                type="button"
                disabled={pending}
                onClick={practise}
                className="learny-aqua-fill mt-1 inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-full px-6 py-3 text-[0.9375rem] font-medium tracking-tight transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:scale-100 [touch-action:manipulation]"
              >
                <Mic aria-hidden="true" className="size-4" strokeWidth={1.75} />
                {intl.formatMessage(messages.practise)}
              </button>
            ) : null}
          </div>
        </>
      )}

      <div className="flex flex-col items-center gap-3 border-t border-foreground/10 pt-6">
        <button
          type="button"
          onClick={erase}
          className="group inline-flex cursor-pointer items-center gap-2 bg-transparent text-[0.8125rem] font-extralight text-muted-foreground-subtle transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--learny-aqua-2))]"
        >
          <Eraser aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
          {intl.formatMessage(messages.forget)}
        </button>
        {/* No account exists, so never let a page of facts imply one. */}
        <p className="max-w-[36ch] text-center text-[0.6875rem] font-extralight leading-relaxed text-muted-foreground-subtle/70">
          {intl.formatMessage(messages.boundToBrowser)}
        </p>
      </div>
    </div>
  );
};

export const LearnerProgress = LearnerProgressComponent;
