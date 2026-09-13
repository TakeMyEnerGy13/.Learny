/**
 * The practice room — Learny.ai's working page, and it fits on ONE screen.
 *
 * Owner decision: the landing page presents, this room practises, and nothing in
 * it may require scrolling. So the page is a height budget, not a stack of
 * sections. What it holds, top to bottom:
 *
 * 1. the language — "I want to speak", the first thing you set and the first thing
 *    you see, standing where a page title and a back-link used to be;
 * 2. how the conversation goes — the four modes, and the scene when it is a
 *    role-play;
 * 3. the particle flag with the pearl control at its centre, sized from the
 *    VIEWPORT so a tall screen gets a big flag and a short one still fits;
 * 4. one status slot — the invitation when idle, the equaliser and the measured
 *    length of the call when live;
 * 5. the pace, and the honest line about capped demo minutes.
 *
 * Deliberately gone with the redesign: the "practice room" eyebrow and the
 * back-to-site link (their space went to the language), the microphone warning the
 * browser gives anyway, the page's own lead line, and the three learning tips — a
 * screen you cannot take in at once is worse than a screen without advice on it.
 *
 * The mechanism (language state, publishing, the pearl button, the equaliser) is
 * shared with the hero through `blocks/practice-voice.tsx`, so the two pages can
 * never disagree about which language a running call is in.
 *
 * Deliberately NOT here: a transcript. The platform's own history rail keeps the
 * session, and a scrolling log of corrections is a different feature the owner
 * has not asked for — inventing one would also mean inventing what it stores.
 */
import { observer } from 'mobx-react-lite';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import type { A2uiNodeViewProps } from '@/app/lib/a2ui/catalog.tsx';
import { str } from '@/app/lib/a2ui/props.ts';
import { useMessagingStore } from '@/app/lib/hooks';
import { AnswerNote } from '../blocks/AnswerNote.tsx';
import { useDismissBootCurtain } from '../blocks/boot-curtain.ts';
import { FlagField } from '../blocks/FlagField.tsx';
import { practiceBrief, practiceNotes } from '../blocks/practice-brief.ts';
import {
  ModeGrid,
  PaceRail,
  PRACTICE_MODES,
  PRACTICE_PACES,
  PRACTICE_SCENARIOS,
  ScenarioChips,
} from '../blocks/PracticeModes.tsx';
import {
  FLAG_BY_LANGUAGE,
  LanguageRail,
  PearlMic,
  usePracticeLanguage,
  usePracticeNotes,
  usePublishedChoice,
  usePublishedText,
  useImmersionLocale,
  useImmersionShift,
  useRememberSpokenTime,
  useSilentVoiceOpen,
  VoicePulse,
} from '../blocks/practice-voice.tsx';

const messages = defineMessages({
  idleTitle: {
    id: 'room.idle.title',
    defaultMessage: 'Press and speak.',
    description: 'Invitation shown in the practice room while no conversation is running.',
  },
  idleScene: {
    id: 'room.idle.scene',
    defaultMessage:
      'Press and open the scene: {scenario, select, cafe {you order, I am the barista} airport {you are boarding, I am the flight attendant} meeting {we have just met} interview {you are the candidate, I am the interviewer} doctor {you are the patient, I am the doctor} other {you start, I stay in role}}.',
    description:
      'Invitation shown in the practice room in role-play mode, naming both parts so the visitor knows they speak the first line. Each case may use the grammar its language needs.',
  },
  immersionHint: {
    id: 'room.immersion.hint',
    defaultMessage:
      'For the length of the conversation the room switches to {language, select, spanish {Spanish} english {English} german {German} russian {Russian} other {the language you practise}} — your own language comes back when it ends.',
    description:
      'Quiet line under the invitation, in the language the visitor reads, warning that the page itself follows the practice language while a call is running. Shown only when the two differ.',
  },
  yourTurnFirst: {
    id: 'room.live.yourTurnFirst',
    defaultMessage: 'Your turn — say the first line',
    description:
      'Status line while the call is open but nothing has been said yet: the visitor speaks first and the agent answers in role.',
  },
  liveTitle: {
    id: 'room.live.title',
    defaultMessage: 'Listening…',
    description: 'Status line while the live conversation is open and the visitor may speak.',
  },
  speakingTitle: {
    id: 'room.live.speaking',
    defaultMessage: 'Speaking…',
    description: 'Status line while the agent itself is talking out loud.',
  },
  elapsed: {
    id: 'room.elapsed',
    defaultMessage: 'Speaking for {minutes}:{seconds}',
    description:
      'The measured length of the current conversation. {minutes} and {seconds} are already ' +
      'zero-padded numbers, e.g. "Speaking for 03:07".',
  },
  languageWant: {
    id: 'room.language.want',
    defaultMessage: 'I want to speak',
    description:
      'Lead-in over the row of practice languages at the top of the practice room, phrased as the ' +
      'visitor’s own wish.',
  },
  note: {
    id: 'room.note',
    defaultMessage:
      'This is a demo, so spoken minutes are capped — conversations are meant to be short.',
    description: 'Quiet footnote of the practice page about the metered demo minutes.',
  },
  flagAlt: {
    id: 'room.flag.alt',
    defaultMessage: 'Animated flag particles for the language being practised',
    description:
      'Accessible description of the decorative particle flag behind the practice room’s voice control.',
  },
});

const pad = (value: number) => String(Math.floor(value)).padStart(2, '0');

const PracticeRoomComponent: FC<A2uiNodeViewProps> = ({ node }) => {
  const intl = useIntl();
  const store = useMessagingStore();
  const { practice, selectLanguage } = usePracticeLanguage(node.props.initialPracticeLanguage);
  // The three controls that make this a room and not a second hero. Same
  // mechanism as the language: press → published pointer → the running call reads
  // it before its next sentence.
  const { value: mode, select: selectMode } = usePublishedChoice(
    '/practice/mode',
    node.props.initialMode,
    PRACTICE_MODES,
    'free',
  );
  const { value: scenario, select: selectScenario } = usePublishedChoice(
    '/practice/scenario',
    node.props.initialScenario,
    PRACTICE_SCENARIOS,
    'cafe',
  );
  const { value: pace, select: selectPace } = usePublishedChoice(
    '/practice/pace',
    node.props.initialPace,
    PRACTICE_PACES,
    'normal',
  );
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const scenesRef = useRef<HTMLDivElement | null>(null);

  // What the four controls above TELL a call that is already running: the screen
  // is re-read before every sentence the voice speaks, so a press mid-conversation
  // lands on the next reply. It is a DESCRIPTION of the screen, though — which is
  // why it cannot be the only channel.
  usePublishedText(
    '/practice/brief',
    practiceBrief({ language: practice, mode, scenario, pace, uiLocale: intl.locale }),
  );

  // ...and what they tell a call as it OPENS. The same setup, said in the
  // visitor's own notes, which the browser hands over before the voice speaks its
  // first word and the runtime injects as instruction-level context. This is what
  // makes the airport scene actually start at the door of the plane instead of
  // being politely reported back. Owner-reported gap; see `practice-brief.ts`.
  //
  // `focus` rides the same channel: when the room was opened to drill a mistake we
  // remember, the call has to arrive already knowing which one. The screen brief
  // cannot carry it — description does not outrank instruction, and the mistake is
  // longer than the brief's budget allows.
  usePracticeNotes(
    practiceNotes({ language: practice, mode, scenario, pace, focus: str(node.props.focus) }),
  );

  // The one channel the platform accepts for the SPOKEN language: while the call
  // runs, the session itself speaks the practice language (the page's labels
  // follow, and the visitor's own interface language comes back when they hang
  // up). Nothing on the screen or in the notes can do this — an explicitly
  // chosen session language is locked against everything else.
  useImmersionLocale(practice);
  const immersionShift = useImmersionShift(practice);

  // Minutes spoken and the scene played are the profile's most honest facts, and
  // this room is where both actually happen. Only a role-play names a scene; free
  // conversation has none to file.
  useRememberSpokenTime(practice, mode === 'roleplay' ? scenario : undefined);

  // The platform's own opening line ("hi, what shall we do?") is what kept
  // arriving instead of the scene — it is authored before any of the above is
  // read. The page spends that one-shot greeting itself, so the call opens
  // listening and the voice's FIRST words are already a reply in role.
  useSilentVoiceOpen();

  // A reload replays the session, so this page can be the FIRST one to mount —
  // then the curtain is ours to lift.
  useDismissBootCurtain();

  // Choosing the role-play adds a row of scenes at the foot of a page that was
  // built to fit exactly one screen — so the choice a visitor just made can land
  // below the fold, looking like nothing happened. Bring it into view, gently,
  // and only on the press: a room that OPENS in role-play should still arrive at
  // its top.
  const openedMode = useRef(mode);
  useEffect(() => {
    if (mode === openedMode.current) {
      return;
    }
    openedMode.current = mode;
    if (mode !== 'scenario') {
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const frame = window.requestAnimationFrame(() => {
      scenesRef.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'end',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  const live = store.speechEnabled;

  // The call now opens in silence (`useSilentVoiceOpen`), so the page owes the
  // visitor the cue the platform's greeting used to give: this tracks whether
  // anything has been said yet, and goes true the moment the voice answers for
  // the first time. Reset with the call, never with a press on a chip.
  const [answered, setAnswered] = useState(false);
  useEffect(() => {
    if (!live) {
      setAnswered(false);
    }
  }, [live]);
  useEffect(() => {
    if (agentSpeaking) {
      setAnswered(true);
    }
  }, [agentSpeaking]);

  // The flag field is steered from the whole box, moves over the microphone
  // included — pointer events bubble up to this wrapper.
  const handlePointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, []);

  const handleLeave = useCallback(() => {
    pointerRef.current = null;
  }, []);

  // The one number on this page, and it is measured: the clock starts when the
  // session actually goes live and resets when it ends, so it can never claim a
  // conversation that is not happening.
  useEffect(() => {
    if (!live) {
      setSeconds(0);
      return;
    }
    const started = Date.now();
    setSeconds(0);
    const timer = window.setInterval(() => {
      setSeconds((Date.now() - started) / 1000);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [live]);

  return (
    <div className="flex flex-col gap-4 pt-1 sm:gap-5">
      {/* What the visitor came for, said in their own words — and the first thing
          they can change. It stands at the very top because everything under it
          only makes sense once this is right. */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[0.6875rem] uppercase tracking-caps text-muted-foreground-subtle">
          {intl.formatMessage(messages.languageWant)}
        </span>
        <LanguageRail practice={practice} onSelect={selectLanguage} />
      </div>

      {/* Then the flag, straight after the language: the top of the room stays
          light — one lead-in, one rail — and the eye lands on the microphone.
          Owner decision after review: the mode plates sit BELOW, not here.

          The flag is measured against the VIEWPORT (not the column): it is the one
          element allowed to grow, so a tall screen gets a large field while a short
          one keeps the whole room above the fold. Aspect-ratio drives the width from
          that height, and the particles are rebuilt at whatever size results —
          nothing is ever stretched. */}
      <div className="flex justify-center">
        <div
          className="relative aspect-[3/2] h-[clamp(11rem,30dvh,21rem)] w-auto"
          onPointerMove={handlePointer}
          onPointerLeave={handleLeave}
        >
          <FlagField
            code={FLAG_BY_LANGUAGE[practice]}
            label={intl.formatMessage(messages.flagAlt)}
            pointer={pointerRef}
            clearRadius={96}
            /* Denser than the hero, and only here: this flag is far wider, so the
               hero's dot count spread over it read as a faded cloud. Owner
               decision — the landing page's field stays untouched. */
            dotsAcross={108}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <PearlMic
              live={live}
              language={practice}
              size="room"
              onToggle={() => store.toggleSpeech()}
            />
          </div>
        </div>
      </div>

      {/* One slot for whatever the state of the call needs to say, so the page
          never jumps when a conversation starts: the invitation before, the
          equaliser and the measured length while it runs. */}
      <div className="flex min-h-14 flex-col items-center justify-center gap-1.5 text-center">
        {live ? (
          <>
            <VoicePulse muted={store.voiceMuted} onSpeakingChange={setAgentSpeaking} tall />
            <p className="text-xs font-extralight tabular-nums text-muted-foreground-subtle">
              {intl.formatMessage(
                agentSpeaking
                  ? messages.speakingTitle
                  : answered
                    ? messages.liveTitle
                    : messages.yourTurnFirst,
              )}
              {' · '}
              {intl.formatMessage(messages.elapsed, {
                minutes: pad(seconds / 60),
                seconds: pad(seconds % 60),
              })}
            </p>
          </>
        ) : (
          <>
            <p className="text-[1.0625rem] font-normal text-foreground/90">
              {mode === 'scenario'
                ? intl.formatMessage(messages.idleScene, { scenario })
                : intl.formatMessage(messages.idleTitle)}
            </p>
            {/* The page follows the call into the practice language, so the visitor
                hears it from us first — in the language they still read, and only
                when the two actually differ. */}
            {immersionShift ? (
              <p className="max-w-[34rem] text-[0.6875rem] font-extralight leading-relaxed text-muted-foreground-subtle">
                {intl.formatMessage(messages.immersionHint, { language: practice })}
              </p>
            ) : null}
          </>
        )}
      </div>

      <PaceRail pace={pace} onSelect={selectPace} />

      {/* HOW the conversation goes, at the FOOT of the room — owner decision: with
          the plates up top the first thing a visitor met was a wall of four
          descriptions instead of the language and the microphone. One row of four,
          so the choice still costs a single band of height. */}
      <ModeGrid mode={mode} onSelect={selectMode} />

      {/* Only in role-play: five scenes beside a mode nobody chose would be a
          control that does nothing. It is `hidden` rather than unmounted only so
          the column's gap does not keep a slot for an empty box.

          The row ANNOUNCES itself as it appears (the arrival screen's own rise-and-
          fade) and, when the page is long enough to scroll, is brought into view.
          Owner report: on a screen where the room already fits, nothing moved and
          the press looked like it did nothing — a page with no overflow has nothing
          to scroll, so the motion has to be in the row itself. */}
      <div ref={scenesRef} className={mode === 'scenario' ? undefined : 'hidden'}>
        {mode === 'scenario' ? (
          <div className="learny-step-in">
            <ScenarioChips scenario={scenario} onSelect={selectScenario} />
          </div>
        ) : null}
      </div>

      <AnswerNote text={str(node.props.note)} />

      {/* The honest line about the cap. Small, centred, and never removed: the
          limit is stated wherever a conversation can be started. */}
      <p className="text-center text-[0.6875rem] font-extralight leading-relaxed text-muted-foreground-subtle">
        {intl.formatMessage(messages.note)}
      </p>
    </div>
  );
};

export const PracticeRoom = observer(PracticeRoomComponent);
