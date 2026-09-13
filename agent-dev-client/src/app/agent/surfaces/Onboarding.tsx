/**
 * Arrival: the two questions everything else on this site depends on.
 *
 * "Which language do you speak?" decides the INTERFACE. "Which one do you want to
 * learn?" decides the VOICE. They are asked separately because on Learny.ai they
 * are separate — a Russian speaker learning German reads Russian and speaks German,
 * and no control on the site ever moves the other one.
 *
 * Both steps are mechanical. Answering the first one advances the screen and
 * proposes that language as the session's interface locale over the socket — the
 * same path the header switcher uses, no agent turn. Only the LAST press calls the
 * agent, with `startPractice`, because someone has to render the site the visitor
 * is being let into.
 *
 * There is a way past it: "just show me the site". A demo that cannot be looked at
 * without answering questions is a worse demo, and the same choices live on the
 * landing page anyway.
 */
import { ArrowRight } from 'lucide-react';
import { type FC, useContext, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import type { A2uiNodeViewProps } from '@/app/lib/a2ui/catalog.tsx';
import { A2uiSurfaceContext } from '@/app/lib/a2ui/surface-context.ts';
import { useMessagingStore } from '@/app/lib/hooks';
import { useLocalization } from '@/app/lib/localization/LocalizationProvider.tsx';
import { wsManager } from '@/app/lib/services/websocket-manager.ts';
import { useDismissBootCurtain } from '../blocks/boot-curtain.ts';
import { relativeDays, rememberLearner, useLearnerArrival } from '../blocks/learner.ts';
import { type LanguageKey, PRACTICE_LANGUAGES } from '../blocks/practice-voice.tsx';

/** The interface locales the site is offered in — the same four as the header. */
const NATIVE_LOCALES = ['en', 'ru', 'es', 'de'] as const;
type NativeLocale = (typeof NATIVE_LOCALES)[number];

/** Which interface locale a practice language is written in, so each option can
 *  be labelled in its own language as well as in the visitor's. */
const LOCALE_BY_LANGUAGE: Record<LanguageKey, NativeLocale> = {
  spanish: 'es',
  english: 'en',
  german: 'de',
  russian: 'ru',
};

const messages = defineMessages({
  step: {
    id: 'onboarding.step',
    defaultMessage: '{current} of {total}',
    description: 'Tiny step counter over the arrival questions, e.g. "1 of 2".',
  },
  nativeQuestion: {
    id: 'onboarding.native.question',
    defaultMessage: 'What language do you speak?',
    description: 'First arrival question: the visitor’s own language, which sets the interface.',
  },
  nativeLead: {
    id: 'onboarding.native.lead',
    defaultMessage: 'The site and our explanations will be in it.',
    description: 'One line under the first arrival question explaining what the answer changes.',
  },
  targetQuestion: {
    id: 'onboarding.target.question',
    defaultMessage: 'And which one do you want to speak?',
    description: 'Second arrival question: the language the visitor wants to practise out loud.',
  },
  targetLead: {
    id: 'onboarding.target.lead',
    defaultMessage: 'That is the language of the conversation. You can change it any time.',
    description: 'One line under the second arrival question explaining what the answer changes.',
  },
  languageName: {
    id: 'hero.language.name',
    defaultMessage:
      '{language, select, spanish {Spanish} english {English} german {German} russian {Russian} other {}}',
    description:
      'Name of one practice language, used as the label of its switch control on the language rail.',
  },
  skip: {
    id: 'onboarding.skip',
    defaultMessage: 'Just show me the site',
    description: 'Quiet control that leaves the arrival questions without answering them.',
  },
  back: {
    id: 'onboarding.back',
    defaultMessage: 'Back',
    description: 'Control that returns from the second arrival question to the first.',
  },
  welcomeBack: {
    id: 'onboarding.return.title',
    defaultMessage: 'Welcome back',
    description: 'Heading shown instead of the arrival questions to a learner we remember.',
  },
  welcomeBackLead: {
    id: 'onboarding.return.lead',
    defaultMessage: 'You were speaking {language}. Shall we carry on?',
    description:
      'Line under the welcome-back heading, naming the language we remember. NOTE: {language} ' +
      'arrives ALREADY INFLECTED for its own locale — in Russian it is the form used after "на" ' +
      '("испанском"), elsewhere the plain name ("español"). Phrase the sentence around that form.',
  },
  lastSeen: {
    id: 'onboarding.return.lastSeen',
    defaultMessage: 'Last time {when}',
    description: 'Small fact chip: when the learner was here last, e.g. "Last time 3 days ago".',
  },
  levelChip: {
    id: 'onboarding.return.level',
    defaultMessage: 'Around {level}',
    description: 'Small fact chip with our ESTIMATE of the learner’s level, e.g. "Around A2".',
  },
  spokenChip: {
    id: 'onboarding.return.spoken',
    defaultMessage: '{minutes} min spoken',
    description: 'Small fact chip: how many minutes the learner has spoken with us in total.',
  },
  mistakesChip: {
    id: 'onboarding.return.mistakes',
    defaultMessage: '{count, plural, one {# mistake to fix} other {# mistakes to fix}}',
    description: 'Small fact chip: how many recurring mistakes we are still working on.',
  },
  writtenChip: {
    id: 'onboarding.return.written',
    defaultMessage: '{count, plural, one {# written line} other {# written lines}}',
    description: 'Small fact chip: how many lines the learner has written with us in total.',
  },
  carryOn: {
    id: 'onboarding.return.continue',
    defaultMessage: 'Carry on in {language}',
    description:
      'Main control for a returning learner: resume in the remembered language. {language} ' +
      'arrives already inflected per locale, exactly as in the lead line above.',
  },
  otherLanguage: {
    id: 'onboarding.return.other',
    defaultMessage: 'A different language',
    description: 'Control that takes a returning learner to the language question instead.',
  },
  seeMemory: {
    id: 'onboarding.return.seeMemory',
    defaultMessage: 'See what you remember',
    description:
      'Control that opens the page listing everything we remember about this learner, before they ' +
      'carry on practising.',
  },
  forget: {
    id: 'onboarding.return.forget',
    defaultMessage: 'Forget me',
    description: 'Quiet control that erases everything we remember about this learner.',
  },
  boundToBrowser: {
    id: 'learner.boundToBrowser',
    defaultMessage: 'Remembered in this browser, without an account.',
    description:
      'Honest footnote wherever remembered facts are shown: there is no login, so the memory ' +
      'belongs to this browser and does not follow the learner to another device.',
  },
});

/** A language's name in its own language — "Deutsch", never "German". The first
 *  question is answered by people who cannot yet read the interface language. */
function endonym(locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale.toUpperCase();
  } catch {
    return locale.toUpperCase();
  }
}

export const LanguageOnboarding: FC<A2uiNodeViewProps> = () => {
  const intl = useIntl();
  const store = useMessagingStore();
  const localization = useLocalization();
  const surface = useContext(A2uiSurfaceContext);

  const [native, setNative] = useState<NativeLocale | null>(null);
  const [pending, setPending] = useState(false);
  /** Set when a remembered learner chooses to answer the questions again anyway. */
  const [askAnyway, setAskAnyway] = useState(false);

  // Records the visit and tells us whether we have met this browser before.
  const learner = useLearnerArrival();
  const remembered =
    !askAnyway && learner.returning && !!learner.profile?.language ? learner.profile : null;

  // This is now the first screen of the session, so it is the one the boot
  // curtain is waiting for — and it waits one round-trip longer here, so a
  // returning learner is never shown the first-time question first.
  useDismissBootCurtain(learner.ready);

  // The answers are one-shot, unlike the rails on the other pages: there is no
  // seed to reconcile and the screen is gone the moment they are given. Still the
  // same two writes as everywhere else — the surface-scoped pointer for whoever
  // reads this screen, the root one for the typed turn's `<ui_state>`.
  const publish = (pointer: string, value: string) => {
    surface?.setValue(pointer, value);
    store.uiState.setLocal(pointer, value);
  };

  const chooseNative = (locale: NativeLocale) => {
    publish('/practice/native', locale);
    setNative(locale);
    rememberLearner({ native: locale });
    // The interface follows immediately, mid-onboarding: the second question is
    // then already in the visitor's own language, which is the whole promise.
    if (localization.messageLocale.toLowerCase().split('-')[0] !== locale) {
      void wsManager.proposeLocale(locale).catch(() => undefined);
    }
  };

  const chooseTarget = (language: LanguageKey) => {
    if (pending) {
      return;
    }
    setPending(true);
    publish('/practice/language', language);
    rememberLearner({ language });
    // Only this press spends an agent turn — it is the one that opens the site.
    surface?.dispatch('startPractice', { native: native ?? 'en', target: language });
  };

  /**
   * A remembered learner resumes. The same action the questions dispatch, plus the
   * memory itself: the agent is answering this turn BEFORE any action-log flush
   * reaches it, so if the greeting is to know who it is talking to, the context of
   * this press is the only channel that arrives in time.
   */
  const carryOn = () => {
    if (pending || !remembered) {
      return;
    }
    setPending(true);
    const language = remembered.language as LanguageKey;
    publish('/practice/language', language);
    if (remembered.native) {
      publish('/practice/native', remembered.native);
    }
    surface?.dispatch('startPractice', {
      native: remembered.native ?? 'en',
      target: language,
      returning: true,
      memory: learner.briefing,
    });
  };

  const forgetMe = () => {
    learner.forget();
    setAskAnyway(true);
  };

  const skip = () => {
    if (pending) {
      return;
    }
    setPending(true);
    surface?.dispatch('skipOnboarding', {});
  };

  // All four, INCLUDING the one they just said they speak — owner decision: "I
  // speak English, I want to learn English" is a real case (a speaker polishing
  // their own language, or someone who simply reads the interface best in it).
  // Filtering it out silently decided for them what they are allowed to practise.
  const targets = PRACTICE_LANGUAGES;

  const onFirstStep = native === null;

  // A learner we remember is met with what we remember, not with a form they have
  // already filled in. Everything on this branch is mechanical: the facts came back
  // with the arrival call, so nothing here waits on the model.
  if (remembered) {
    const languageName = intl.formatMessage(messages.languageName, {
      language: remembered.language,
    });
    const when = relativeDays(remembered.lastSeenAt, localization.messageLocale);
    const minutes = Math.round(remembered.spokenSeconds / 60);
    const recurring = remembered.mistakes.filter((mistake) => mistake.count > 1).length;
    const chips = [
      when ? intl.formatMessage(messages.lastSeen, { when }) : null,
      remembered.level ? intl.formatMessage(messages.levelChip, { level: remembered.level.code }) : null,
      minutes >= 1 ? intl.formatMessage(messages.spokenChip, { minutes }) : null,
      remembered.writtenTurns > 0
        ? intl.formatMessage(messages.writtenChip, { count: remembered.writtenTurns })
        : null,
      recurring > 0 ? intl.formatMessage(messages.mistakesChip, { count: recurring }) : null,
    ].filter((chip): chip is string => !!chip);

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <div className="learny-step-in flex flex-col items-center gap-3">
          <h1 className="text-balance text-[clamp(1.75rem,4.4vw,2.75rem)] font-normal leading-[1.1] tracking-tight text-foreground">
            {intl.formatMessage(messages.welcomeBack)}
          </h1>
          <p className="max-w-[44ch] text-[0.9375rem] font-extralight leading-relaxed text-foreground/60">
            {intl.formatMessage(messages.welcomeBackLead, { language: languageName })}
          </p>
        </div>

        {chips.length > 0 ? (
          <div className="learny-step-in mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {chips.map((chip, index) => (
              <span key={chip} className="flex items-center gap-3">
                {index > 0 ? (
                  <span aria-hidden="true" className="h-3 w-px bg-[hsl(var(--learny-aqua-2)/0.35)]" />
                ) : null}
                <span className="text-[0.75rem] font-extralight uppercase tracking-caps text-foreground/45">
                  {chip}
                </span>
              </span>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={carryOn}
          style={{ animationDelay: '90ms' }}
          className="learny-step-in learny-choice mt-9 min-w-[16rem] cursor-pointer px-7 py-4 disabled:cursor-default [touch-action:manipulation]"
        >
          <span className="block text-[1.0625rem] text-foreground">
            {intl.formatMessage(messages.carryOn, { language: languageName })}
          </span>
        </button>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setAskAnyway(true)}
            className="cursor-pointer bg-transparent text-[0.8125rem] font-extralight text-muted-foreground-subtle transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--learny-aqua-2))]"
          >
            {intl.formatMessage(messages.otherLanguage)}
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            className="group flex cursor-pointer items-center gap-1.5 bg-transparent text-[0.8125rem] font-extralight text-muted-foreground-subtle transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--learny-aqua-2))]"
          >
            {intl.formatMessage(messages.skip)}
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={1.5}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              if (pending) {
                return;
              }
              setPending(true);
              surface?.dispatch('showProgress', {});
            }}
            disabled={pending}
            className="cursor-pointer bg-transparent text-[0.8125rem] font-extralight text-muted-foreground-subtle transition-colors hover:text-foreground disabled:cursor-default focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--learny-aqua-2))]"
          >
            {intl.formatMessage(messages.seeMemory)}
          </button>
          <button
            type="button"
            onClick={forgetMe}
            className="cursor-pointer bg-transparent text-[0.8125rem] font-extralight text-muted-foreground-subtle/70 transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--learny-aqua-2))]"
          >
            {intl.formatMessage(messages.forget)}
          </button>
        </div>

        {/* No account exists, so never let the memory imply one. */}
        <p className="mt-8 max-w-[36ch] text-[0.6875rem] font-extralight leading-relaxed text-muted-foreground-subtle/70">
          {intl.formatMessage(messages.boundToBrowser)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <span className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
        {intl.formatMessage(messages.step, { current: onFirstStep ? 1 : 2, total: 2 })}
      </span>

      {/* Keyed on the step so the whole block replays its entrance: a step change
          reads as a new card arriving, not as text being swapped in place. */}
      <div key={onFirstStep ? 'native' : 'target'} className="learny-step-in mt-6 flex flex-col items-center gap-3">
        <h1 className="text-balance text-[clamp(1.75rem,4.4vw,2.75rem)] font-normal leading-[1.1] tracking-tight text-foreground">
          {intl.formatMessage(onFirstStep ? messages.nativeQuestion : messages.targetQuestion)}
        </h1>
        <p className="max-w-[42ch] text-[0.9375rem] font-extralight leading-relaxed text-foreground/60">
          {intl.formatMessage(onFirstStep ? messages.nativeLead : messages.targetLead)}
        </p>
      </div>

      <div
        key={onFirstStep ? 'native-options' : 'target-options'}
        className="mt-10 flex w-full max-w-[44rem] flex-wrap justify-center gap-3"
      >
        {onFirstStep
          ? NATIVE_LOCALES.map((locale, index) => (
              <button
                key={locale}
                type="button"
                lang={locale}
                onClick={() => chooseNative(locale)}
                style={{ animationDelay: `${index * 70}ms` }}
                className="learny-step-in learny-choice min-w-[9.5rem] grow basis-[9.5rem] cursor-pointer px-5 py-4 [touch-action:manipulation]"
              >
                <span className="block text-[1.0625rem] text-foreground" translate="no">
                  {endonym(locale)}
                </span>
              </button>
            ))
          : targets.map((language, index) => (
              <button
                key={language}
                type="button"
                disabled={pending}
                onClick={() => chooseTarget(language)}
                style={{ animationDelay: `${index * 70}ms` }}
                className="learny-step-in learny-choice group min-w-[10.5rem] grow basis-[10.5rem] cursor-pointer px-5 py-4 disabled:cursor-default [touch-action:manipulation]"
              >
                <span
                  className="block text-[1.0625rem] text-foreground"
                  lang={LOCALE_BY_LANGUAGE[language]}
                  translate="no"
                >
                  {endonym(LOCALE_BY_LANGUAGE[language])}
                </span>
                {/* The same name in the language they just told us they speak, so
                    the choice is unmistakable even in an unfamiliar script. */}
                <span className="mt-1 block text-[0.8125rem] font-extralight text-foreground/50">
                  {intl.formatMessage(messages.languageName, { language })}
                </span>
              </button>
            ))}
      </div>

      <div className="mt-10 flex items-center gap-6">
        {onFirstStep ? null : (
          <button
            type="button"
            onClick={() => setNative(null)}
            className="cursor-pointer bg-transparent text-[0.8125rem] font-extralight text-muted-foreground-subtle transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--learny-aqua-2))]"
          >
            {intl.formatMessage(messages.back)}
          </button>
        )}
        <button
          type="button"
          onClick={skip}
          disabled={pending}
          className="group flex cursor-pointer items-center gap-1.5 bg-transparent text-[0.8125rem] font-extralight text-muted-foreground-subtle transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--learny-aqua-2))]"
        >
          {intl.formatMessage(messages.skip)}
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
            strokeWidth={1.5}
          />
        </button>
      </div>
    </div>
  );
};
