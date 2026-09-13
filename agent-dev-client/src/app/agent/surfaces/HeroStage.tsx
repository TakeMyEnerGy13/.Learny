/**
 * Learny.ai's home hero — the agent's first paint.
 *
 * Left: the offer as pure typography (label, oversized headline, ultra-light
 * supporting line, three glass qualifier plates). Right: the one primary action
 * of the whole site — the pearl live-voice control — inside a particle field
 * that paints the flag of the language the agent currently practises.
 *
 * The field is this screen's single authored motion. On arrival (and on every
 * language change) the particles stream out from behind the control and settle
 * into the flag, then drift, and push away from the pointer. Under
 * `prefers-reduced-motion` the flag is drawn once, assembled and still.
 *
 * The voice control drives the platform's realtime session directly
 * (`MessagesStore.toggleSpeech`) — the same switch as the microphone in the
 * input dock, so the omnibox waveform, captions and end-call control all keep
 * working. It never fakes a call.
 */
import { type FC, type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { defineMessages, useIntl } from 'react-intl';
import type { A2uiNodeViewProps } from '@/app/lib/a2ui/catalog.tsx';
import { str } from '@/app/lib/a2ui/props.ts';
import { useMessagingStore } from '@/app/lib/hooks';
import { decorateHeadline } from '../blocks/decorateHeadline.tsx';
import { AnswerNote } from '../blocks/AnswerNote.tsx';
import { useDismissBootCurtain } from '../blocks/boot-curtain.ts';
import { FlagField } from '../blocks/FlagField.tsx';
import { HowItWorks } from '../blocks/HowItWorks.tsx';
import { heroBrief, heroNotes } from '../blocks/practice-brief.ts';
import {
  FLAG_BY_LANGUAGE,
  LanguageRail,
  PearlMic,
  usePracticeLanguage,
  usePracticeNotes,
  usePublishedText,
  useImmersionLocale,
  useRememberSpokenTime,
  useSilentVoiceOpen,
  VoicePulse,
} from '../blocks/practice-voice.tsx';
import { Pricing } from '../blocks/Pricing.tsx';
import { PracticeCta } from '../blocks/PracticeCta.tsx';
import { VoiceMechanics } from '../blocks/VoiceMechanics.tsx';

const messages = defineMessages({
  liveNow: {
    id: 'hero.voice.live',
    defaultMessage: 'Listening…',
    description: 'Status line under the hero voice control while the live conversation is open.',
  },
  speakingNow: {
    id: 'hero.voice.speaking',
    defaultMessage: 'Speaking…',
    description:
      'Status line under the hero voice control while the agent itself is talking out loud.',
  },
  flagAlt: {
    id: 'hero.flag.alt',
    defaultMessage: 'Animated flag particles for the current practice language',
    description: 'Accessible description of the decorative particle flag behind the voice control.',
  },
  speakLanguage: {
    id: 'hero.voice.speakLanguage',
    defaultMessage:
      '{language, select, spanish {Speak Spanish} english {Speak English} german {Speak German} russian {Speak Russian} other {Start speaking}}',
    description:
      'Label under the voice control, naming the language the visitor is about to speak. Each case may use the grammar its language needs.',
  },
  practiceLanguageLead: {
    id: 'hero.language.lead',
    defaultMessage: 'I want to speak',
    description:
      'Quiet lead-in printed before the row of practice languages on the hero, e.g. "I want to speak: Spanish".',
  },
  // The whole offer lives here rather than in the render: this is fixed brand
  // copy, so pressing a language in the header retranslates the page at once.
  eyebrow: {
    id: 'hero.eyebrow',
    defaultMessage: 'Live voice practice',
    description: 'Small label above the home headline, set in the brand gradient.',
  },
  headline: {
    id: 'hero.headline',
    defaultMessage: 'Learn a language by speaking it.',
    description: 'The home screen headline, set at display size over two or three lines.',
  },
  headlineScriptWord: {
    id: 'hero.headline.scriptWord',
    defaultMessage: 'language',
    description:
      'ONE word copied verbatim out of the home headline — the word that carries the decorative ' +
      'script. It must appear in the headline of the SAME language exactly as written there, in that ' +
      'grammatical form. Leave it empty when no single word fits, and the headline stays plain.',
  },
  description: {
    id: 'hero.description',
    defaultMessage:
      'Press the microphone to talk. We reply in the language you are learning and correct you as you go.',
    description: 'Supporting line under the home headline.',
  },
  noteLanguages: {
    id: 'hero.note.languages',
    defaultMessage: '4 languages',
    description: 'Qualifier plate on the home screen: how many languages can be practised.',
  },
  noteNoSignup: {
    id: 'hero.note.noSignup',
    defaultMessage: 'No signup',
    description: 'Qualifier plate on the home screen: no account is needed.',
  },
  noteFree: {
    id: 'hero.note.free',
    defaultMessage: 'Free to try',
    description: 'Qualifier plate on the home screen: trying it costs nothing.',
  },
  voiceHint: {
    id: 'hero.voice.hint',
    defaultMessage: 'Your browser will ask to use your microphone.',
    description: 'One quiet line under the voice control, warning about the microphone prompt.',
  },
});



/** The halo behind a hovered qualifier: the blue end only, never the pale core. */
const EDGE_GLOW =
  'linear-gradient(100deg, hsl(var(--learny-aqua-1)) 0%, hsl(var(--learny-aqua-2)) 100%)';

/**
 * The headline with ONE word set in the decorative script — see
 * `blocks/decorateHeadline.tsx`, shared with the third section's heading.
 *
 * The voice control, the language rail and the equaliser are NOT here: they are
 * shared with the practice room and live in `blocks/practice-voice.tsx`, so the
 * two pages can never disagree about the language a call is running in.
 */

const HeroStageComponent: FC<A2uiNodeViewProps> = ({ node }) => {
  const intl = useIntl();
  const store = useMessagingStore();
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const { practice, selectLanguage } = usePracticeLanguage(node.props.initialPracticeLanguage);
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  // What a call started from THIS page is told: the language, and that the
  // interface language is not it. The landing page has no mode, scene or pace, so
  // the brief claims none — the room is where a conversation is shaped.
  usePublishedText('/practice/brief', heroBrief({ language: practice, uiLocale: intl.locale }));

  // The same setup in the visitor's own notes, which reach the call as it opens
  // rather than as a description of the screen. From here that is the practice
  // language and the standing permission to carry the conversation over to it once
  // the visitor answers in it.
  usePracticeNotes(heroNotes({ language: practice }));

  // Same one channel as the room: a call started here speaks the practice
  // language because the session does, for as long as the call lasts.
  useImmersionLocale(practice);

  // A call can start right here on the landing page, so this page counts its
  // minutes too. No scene: the home microphone is free conversation by definition.
  useRememberSpokenTime(practice);

  // Same reason as the room: the platform's greeting invites a question in the
  // interface language, which is the opposite of what a practice call is for.
  // The landing page spends it too, so a call started here opens listening and
  // the visitor's first sentence sets the language.
  useSilentVoiceOpen();

  // The whole field area steers the particles — including moves over the voice
  // control, since pointer events bubble up to this wrapper.
  const handlePointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, []);

  const handleLeave = useCallback(() => {
    pointerRef.current = null;
  }, []);

  // The boot curtain waits for the first real screen: once a screen is up there
  // is nothing left to cover.
  useDismissBootCurtain();

  const eyebrow = intl.formatMessage(messages.eyebrow);
  const headline = intl.formatMessage(messages.headline);
  const description = intl.formatMessage(messages.description);
  const notes = [
    intl.formatMessage(messages.noteLanguages),
    intl.formatMessage(messages.noteNoSignup),
    intl.formatMessage(messages.noteFree),
  ];
  const voiceHint = intl.formatMessage(messages.voiceHint);
  const flag = FLAG_BY_LANGUAGE[practice];
  const live = store.speechEnabled;

  return (
    <>
      <div className="grid items-center gap-14 py-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12 lg:py-24">
      <div className="flex flex-col gap-7">
        {eyebrow ? (
          <span className="learny-aqua-text-sm text-xs font-semibold tracking-caps">{eyebrow}</span>
        ) : null}
        <h1 className="text-balance text-[clamp(2.5rem,6.6vw,4.5rem)] font-normal leading-[1.04] tracking-tighter text-foreground">
          {decorateHeadline(headline, intl.formatMessage(messages.headlineScriptWord))}
        </h1>
        {description ? (
          <p className="max-w-[44ch] text-lg font-extralight leading-relaxed text-foreground/75">
            {description}
          </p>
        ) : null}
        {notes.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-2.5">
            {notes.map((note) => (
              /* On hover a blue halo lights UP BEHIND the plate and nothing
                 else: the glass keeps its own colour, the bloom only escapes
                 around the edges. Deliberately quiet — a suggestion of light,
                 not a highlight. */
              <li key={note} className="group relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 rounded-full opacity-0 blur-[10px] transition-opacity duration-[400ms] ease-out group-hover:opacity-45 motion-reduce:transition-none"
                  style={{ backgroundImage: EDGE_GLOW }}
                />
                <span className="relative flex rounded-full border border-foreground/10 bg-foreground/[0.07] px-4 py-2 text-sm text-foreground/85 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.14)] backdrop-blur-md transition-[transform,border-color] duration-[400ms] ease-out group-hover:-translate-y-px group-hover:border-[hsl(var(--learny-aqua-1)/0.45)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                  {note}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-6">
        <div
          className="relative aspect-[3/2] w-full max-w-[30rem]"
          onPointerMove={handlePointer}
          onPointerLeave={handleLeave}
        >
          <FlagField
            code={flag}
            label={intl.formatMessage(messages.flagAlt)}
            pointer={pointerRef}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <PearlMic live={live} language={practice} onToggle={() => store.toggleSpeech()} />
          </div>
        </div>
        {/* The practice choice is a quiet rail, deliberately unlike the glass
            qualifier plates on the left: no plates, no boxes — four names, the
            live one lit in the brand gradient over a hairline. Shared with the
            practice room, so both pages change the language the same way. */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
            {intl.formatMessage(messages.practiceLanguageLead)}
          </span>
          <LanguageRail practice={practice} onSelect={selectLanguage} />
        </div>

        <div className="flex min-h-5 w-full flex-col items-center gap-2 text-center">
          {live ? (
            <>
              <VoicePulse muted={store.voiceMuted} onSpeakingChange={setAgentSpeaking} />
              <span className="text-sm font-medium text-foreground" aria-live="polite">
                {intl.formatMessage(agentSpeaking ? messages.speakingNow : messages.liveNow)}
              </span>
            </>
          ) : (
            <span className="max-w-[28ch] text-xs text-muted-foreground-subtle">{voiceHint}</span>
          )}
        </div>
      </div>
      </div>

      <AnswerNote text={str(node.props.answer)} />
      <HowItWorks />
      <VoiceMechanics />
      <PracticeCta />
      <Pricing />
    </>
  );
};

export const HeroStage = observer(HeroStageComponent);
