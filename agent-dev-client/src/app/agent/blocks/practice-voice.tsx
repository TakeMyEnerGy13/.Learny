/**
 * The practice mechanism, shared by the two pages that carry it: the landing
 * hero and the practice room.
 *
 * It lives here because a second copy of it would be a second truth about which
 * language the visitor is practising — and that value is read by a live voice
 * call, so a copy that drifts is a call speaking the wrong language. One hook,
 * one rail, one microphone button, used by both screens.
 *
 * What is NOT here: the hero's flag particle field, which belongs to the landing
 * page's theatre and would be a distraction in the room.
 */
import { Mic, Square } from 'lucide-react';
import { type FC, Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { A2uiSurfaceContext } from '@/app/lib/a2ui/surface-context.ts';
import { str } from '@/app/lib/a2ui/props.ts';
import { useMessagingStore } from '@/app/lib/hooks';
import { useLocalization } from '@/app/lib/localization/LocalizationProvider.tsx';
import { wsManager } from '@/app/lib/services/websocket-manager.ts';
import { realtimeVoiceLevels } from '@/app/lib/services/voice-realtime.service.ts';
import { claimFirstVoiceOpen } from '@/app/lib/services/voice-greeting-ledger.ts';
import type { FlagCode } from './FlagField.tsx';
import { rememberLearner } from './learner.ts';
import { NOTE_MARKER } from './practice-brief.ts';

export type LanguageKey = 'spanish' | 'english' | 'german' | 'russian';

export const PRACTICE_LANGUAGES: LanguageKey[] = ['spanish', 'english', 'german', 'russian'];

/** Which flag the particle field draws for a practice language. */
export const FLAG_BY_LANGUAGE: Record<LanguageKey, FlagCode> = {
  spanish: 'es',
  english: 'en',
  german: 'de',
  russian: 'ru',
};

export const PEARL_SURFACE =
  'radial-gradient(120% 120% at 30% 22%, hsl(var(--pearl-1)) 0%, hsl(var(--pearl-4)) 34%, ' +
  'hsl(var(--pearl-3)) 62%, hsl(var(--pearl-2)) 100%)';

/** The brand gradient's lit half, for the hairlines that cannot be a text fill. */
export const AQUA_GRADIENT =
  'linear-gradient(100deg, hsl(var(--learny-aqua-2)) 0%, hsl(var(--learny-aqua-3)) 100%)';

const messages = defineMessages({
  languageName: {
    id: 'hero.language.name',
    defaultMessage:
      '{language, select, spanish {Spanish} english {English} german {German} russian {Russian} other {}}',
    description:
      'Name of one practice language, used as the label of its switch control on the language rail.',
  },
  practiceLanguageGroup: {
    id: 'hero.language.group',
    defaultMessage: 'Language you practise',
    description:
      'Accessible group name of the four controls that switch the practice language.',
  },
  startVoice: {
    id: 'hero.voice.start',
    defaultMessage:
      'Start speaking {language, select, spanish {Spanish} english {English} german {German} russian {Russian} other {}}',
    description:
      'Accessible name of the control that opens the live voice conversation, naming the practice language.',
  },
  endVoice: {
    id: 'hero.voice.end',
    defaultMessage: 'End the conversation',
    description: 'Accessible name of the voice control while a live conversation is running.',
  },
});

/**
 * One mechanical choice on the page: what the visitor pressed, published where a
 * running voice call can read it.
 *
 * Every control on the practice pages goes through this — the language, the mode,
 * the scenario, the pace — so there is exactly ONE publish path and they cannot
 * develop four different ideas of what "the visitor pressed it" means.
 *
 * The render prop is only a SEED. A reload replays the session's messages from
 * the start, so the seed a remounted screen sees can be the value the page opened
 * on long ago; the published value is younger — it is the visitor's own last
 * press — so it wins whenever it exists.
 */
export function usePublishedChoice<T extends string>(
  pointer: string,
  seed: unknown,
  allowed: readonly T[],
  fallback: T,
): { value: T; select: (next: T) => void } {
  const store = useMessagingStore();
  const surface = useContext(A2uiSurfaceContext);

  const parse = (raw: unknown): T | null => {
    const text = str(raw).toLowerCase();
    return allowed.find((candidate) => candidate === text) ?? null;
  };

  const rendered = parse(seed) ?? fallback;
  const published = parse(store.uiState.get(pointer));
  const [value, setValue] = useState<T>(published ?? rendered);

  // Flips the moment this screen becomes the authority on this choice — a press
  // by the visitor, or a later render that carries another value. Until then the
  // screen only listens.
  const isAuthority = useRef(false);

  // A LATER render still wins: when the visitor asks the agent for another
  // language or mode, it re-renders with a new seed and the screen must follow —
  // and that new choice has to be published too, or a running call would keep
  // reading the previous value. Only an actual change counts, so a re-render
  // carrying the same seed never undoes a press the visitor made in between.
  const lastRendered = useRef<T>(rendered);

  useEffect(() => {
    if (lastRendered.current !== rendered) {
      lastRendered.current = rendered;
      isAuthority.current = true;
      setValue(rendered);
    }
  }, [rendered]);

  // The surface api is rebuilt on every render of the renderer above, so it can
  // never be an effect dependency: committing a value re-renders this tree, which
  // would hand the effect a "new" api and commit again — an endless publish loop
  // that locks the page. Keep it in a ref and let the value itself be the only
  // trigger.
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  // Publish only on a real event — a press by the visitor, or a later render that
  // genuinely carries another value. Deliberately NOT on mount: a local write
  // marks the pointer dirty, and a dirty pointer beats every incoming server
  // snapshot until the next sync, so publishing the seed on mount stamped the
  // replayed opening value over the choice the session had actually stored.
  useEffect(() => {
    if (!isAuthority.current) {
      return;
    }
    // Two writes, one truth. The surface-scoped pointer is what a READER of this
    // screen sees — the live voice session is shown the surface's declared field
    // values, and this is the only way a press reaches a call already running.
    // The root pointer is for the typed turn: `<ui_state>` carries every surface
    // the session ever rendered, so a screen-scoped value alone could be read off
    // a stale twin. At the root there is exactly one.
    surfaceRef.current?.setValue(pointer, value);
    store.uiState.setLocal(pointer, value);
    surfaceRef.current?.commitValue();
  }, [pointer, value, store]);

  // Adopt the session's stored choice when it arrives. On a reconnect the server
  // sends its uiState right after the history, so the value lands a moment AFTER
  // the screen has mounted — too late for the initial state above.
  useEffect(() => {
    if (isAuthority.current || published === null) {
      return;
    }
    setValue(published);
  }, [published]);

  const select = useCallback((next: T) => {
    // A press is the event that makes this screen the authority: from here on it
    // publishes, and it stops taking the session's older stored value. Publishing
    // is the effect's job — one path in, so screen and published value can never
    // disagree.
    isAuthority.current = true;
    setValue((current) => (current === next ? current : next));
  }, []);

  return { value, select };
}

/**
 * Publishes a DERIVED string — text this screen computes from choices the visitor
 * has already made, rather than a choice of its own.
 *
 * Separate from `usePublishedChoice` on purpose. That hook guards a value the
 * visitor owns: it refuses to publish until a press or a new render makes the
 * screen the authority, because stamping a replayed seed over the session's
 * stored choice loses the visitor's own last press. A derived value has nothing
 * to lose — it is a function of those choices — so it publishes as soon as it
 * differs, including on mount, which is what a call started seconds after the
 * page appears needs.
 */
export function usePublishedText(pointer: string, text: string): void {
  const store = useMessagingStore();
  const surface = useContext(A2uiSurfaceContext);

  // Same reason as in the hook above: the surface api is a fresh object on every
  // render, so it can never be an effect dependency without looping.
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  const published = useRef<string | null>(null);

  useEffect(() => {
    if (published.current === text) {
      return;
    }
    published.current = text;
    surfaceRef.current?.setValue(pointer, text);
    store.uiState.setLocal(pointer, text);
    surfaceRef.current?.commitValue();
  }, [pointer, text, store]);
}

/**
 * Keeps the practice setup in the visitor's own saved notes — the one channel
 * that reaches a voice call as INSTRUCTION rather than as a description of the
 * screen, and the reason a call can open in character instead of with a generic
 * hello (see `practice-brief.ts` for why the screen alone could not do it).
 *
 * Replace, never accumulate: our own notes are marked, so a changed setup drops
 * the previous ones instead of leaving the model a pile of contradicting
 * scenes. Everything else in the bank — what the visitor told the voice about
 * themselves — is left strictly alone.
 *
 * Written only once the bank has opened its own storage: notes added before that
 * are invisible to the call that reads them, so the flag is a dependency and the
 * write simply happens when it flips.
 */
export function usePracticeNotes(notes: readonly string[]): void {
  const store = useMessagingStore();
  const bank = store.memoryStore;
  const ready = bank.initialized;
  const written = useRef<string | null>(null);
  const key = notes.join('\n');

  useEffect(() => {
    if (!ready || written.current === key) {
      return;
    }
    written.current = key;
    const wanted = new Set(notes);
    for (const entry of [...bank.memories]) {
      if (entry.summary.startsWith(NOTE_MARKER) && !wanted.has(entry.summary)) {
        bank.remove(entry.id);
      }
    }
    for (const note of notes) {
      bank.add(note);
    }
  }, [bank, ready, key, notes]);
}

/**
 * Takes the OPENING LINE of a call away from the platform.
 *
 * The first voice open of a page load is granted a greeting, and that greeting
 * is not ours to write: a platform instruction asks for one warm line that
 * invites a question, and forbids it from using anything the visitor's notes
 * say. Owner report, three times over — press role-play, press the interview,
 * and the call still opens "hi, what shall we do?", the scene forgotten. No
 * screen field and no note can outrank that, because the line is authored
 * before either is consulted.
 *
 * So the page claims that one-shot right on mount and spends it on nothing. The
 * call then opens LISTENING, and the first thing the voice says is an ordinary
 * reply — the only kind of turn where the screen brief and the notes actually
 * apply. The visitor speaks first, which for practice is the truer exercise
 * anyway; the page says so where it used to say "press and speak".
 *
 * Page-load scoped by design, so this is spent once per visit and costs nothing
 * when the visitor never opens voice at all.
 */
export function useSilentVoiceOpen(): void {
  useEffect(() => {
    claimFirstVoiceOpen();
  }, []);
}

/** The interface locale that speaking each practice language requires. */
const LOCALE_BY_LANGUAGE: Record<LanguageKey, string> = {
  spanish: 'es',
  english: 'en',
  german: 'de',
  russian: 'ru',
};

const primarySubtag = (locale: string): string => (locale.split('-')[0] ?? locale).toLowerCase();

/**
 * Where we owe the visitor their reading language back.
 *
 * Committing a locale is not a temporary act: the platform PERSISTS a committed
 * choice as the visitor's explicit preference, and proposes it again on every
 * later session. So a call that ends normally is not enough — a visitor who
 * closes the tab mid-call would come back to a site permanently in the language
 * they were only practising. We leave ourselves a breadcrumb before switching
 * and honour it on the next mount, which survives a reload, a crash and a
 * closed tab alike.
 */
const RESTORE_KEY = 'learny:interface-locale-owed';

function readOwedLocale(): string | null {
  try {
    return window.localStorage.getItem(RESTORE_KEY);
  } catch {
    return null;
  }
}

function writeOwedLocale(locale: string | null): void {
  try {
    if (locale === null) {
      window.localStorage.removeItem(RESTORE_KEY);
      return;
    }
    window.localStorage.setItem(RESTORE_KEY, locale);
  } catch {
    /* A browser that refuses storage still gets the in-session restore below. */
  }
}

/**
 * IMMERSION: while a call is live, the session speaks the practice language.
 *
 * The session has exactly ONE language, and it is the language the voice is
 * instructed to speak on every single response. Worse for us, a language the
 * visitor picked himself is locked: "keep it even when a later utterance is
 * clearly in another language; conversational evidence cannot override it". So
 * with a Russian interface chosen in onboarding, no brief and no note could ever
 * make the voice answer in English — three owner reports, all the same wall.
 *
 * The only honest way through is the one the header already uses: commit the
 * practice language as the session language for the duration of the call. The
 * voice picks it up on a running call (the runtime re-states the committed
 * language to it as the locale changes), and the page's own labels follow —
 * which is what a practice room in immersion mode should look like anyway.
 *
 * The interface language the visitor arrived with is remembered and proposed
 * back the moment the call ends, so the room they read is theirs again. Changing
 * the practice chip mid-call moves the session with it, and never overwrites
 * that remembered language.
 *
 * A committed language PERSISTS as the visitor's preference, so "the call ended"
 * cannot be the only restore path: the language owed back is also written to
 * local storage and honoured on the next mount, which covers a closed tab, a
 * reload and a crash.
 */
export function useImmersionLocale(practice: LanguageKey): void {
  const store = useMessagingStore();
  const localization = useLocalization();
  const live = store.speechEnabled;
  const target = LOCALE_BY_LANGUAGE[practice];
  // Read through a ref: the committed locale CHANGES as a result of what this
  // hook proposes, and depending on it would re-run the effect on its own echo.
  const committedRef = useRef(primarySubtag(localization.messageLocale));
  committedRef.current = primarySubtag(localization.messageLocale);
  const arrivedWithRef = useRef<string | null>(null);

  // A call that never ended cleanly (closed tab, reload, crash) left the session
  // speaking the practice language. Give it back before anything else runs.
  useEffect(() => {
    const owed = readOwedLocale();
    if (owed === null) {
      return;
    }
    writeOwedLocale(null);
    if (owed !== committedRef.current) {
      void wsManager.proposeLocale(owed).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (live) {
      if (arrivedWithRef.current === null) {
        arrivedWithRef.current = committedRef.current;
        writeOwedLocale(committedRef.current);
      }
      if (committedRef.current !== target) {
        void wsManager.proposeLocale(target).catch(() => undefined);
      }
      return;
    }
    const arrivedWith = arrivedWithRef.current;
    arrivedWithRef.current = null;
    if (arrivedWith === null) {
      return;
    }
    writeOwedLocale(null);
    if (arrivedWith !== committedRef.current) {
      void wsManager.proposeLocale(arrivedWith).catch(() => undefined);
    }
  }, [live, target]);
}

/**
 * Whether practising this language will move the page off the language the
 * visitor reads — the one thing worth warning about BEFORE a call, since during
 * one the two are equal by construction.
 */
export function useImmersionShift(practice: LanguageKey): boolean {
  const localization = useLocalization();
  return primarySubtag(localization.messageLocale) !== LOCALE_BY_LANGUAGE[practice];
}

/**
 * How long the visitor actually SPOKE, filed into what we remember about them.
 *
 * Minutes spoken is the one number on this site that no model can estimate and
 * nobody should have to claim: either the microphone was open or it was not. The
 * page is the only witness, so the page records it.
 *
 * Filed in chunks while the call runs rather than once at the end, because the most
 * common way a practice call ends is the tab closing — and an hour of speaking that
 * only counts if the visitor presses the right button is worse than an hour counted
 * a half-minute at a time. Each chunk is a DELTA, never a total, so a chunk arriving
 * twice would be the only way to overcount and the timer never fires twice for the
 * same stretch.
 *
 * The scene is filed once per call, at the start, so a role-play the visitor
 * abandoned still shows up as one they have tried.
 */
export function useRememberSpokenTime(practice: LanguageKey, scene?: string): void {
  const store = useMessagingStore();
  const live = store.speechEnabled;

  useEffect(() => {
    if (!live) {
      return;
    }
    rememberLearner({ language: practice, ...(scene ? { scene } : {}) });

    let since = Date.now();
    const flush = () => {
      const seconds = Math.round((Date.now() - since) / 1000);
      if (seconds < 3) {
        return;
      }
      since = Date.now();
      rememberLearner({ spokenSeconds: seconds });
    };
    const timer = window.setInterval(flush, 30_000);
    // A closed tab is a call that ended; browsers grant this one last write.
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      // The stretch since the last chunk — the ordinary end of a call.
      flush();
    };
  }, [live, practice, scene]);
}

/** The practice language, the oldest of the mechanical choices. */
export function usePracticeLanguage(seed: unknown): {
  practice: LanguageKey;
  selectLanguage: (language: LanguageKey) => void;
} {
  const { value, select } = usePublishedChoice(
    '/practice/language',
    seed,
    PRACTICE_LANGUAGES,
    'spanish',
  );
  return { practice: value, selectLanguage: select };
}

/**
 * A row of choices as a quiet rail: no plates, no boxes — labels separated by
 * hairlines, the live one lit in the brand gradient over a gradient underline.
 * Mechanical, like a real site's control: a press changes the session with no
 * agent turn at all, mid-call included.
 *
 * Used for the practice language and for the speaking pace, so the two read as
 * the same kind of switch.
 */
export const ChoiceRail = <T extends string>({
  items,
  value,
  label,
  onSelect,
}: {
  items: readonly { value: T; label: string }[];
  value: T;
  label: string;
  onSelect: (next: T) => void;
}) => (
  <div role="group" aria-label={label} className="flex flex-wrap items-center justify-center">
    {items.map((item, index) => {
      const selected = item.value === value;
      return (
        <Fragment key={item.value}>
          {index > 0 ? (
            <span aria-hidden="true" className="h-3 w-px flex-none bg-foreground/15" />
          ) : null}
          <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(item.value)}
            className="relative cursor-pointer bg-transparent px-3.5 py-1.5 text-[0.9375rem] transition-colors [touch-action:manipulation] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary"
          >
            <span
              className={
                selected
                  ? 'learny-aqua-text-sm font-medium'
                  : 'text-muted-foreground-subtle transition-colors hover:text-foreground'
              }
            >
              {item.label}
            </span>
            {selected ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 -bottom-px h-px rounded-full"
                style={{ backgroundImage: AQUA_GRADIENT }}
              />
            ) : null}
          </button>
        </Fragment>
      );
    })}
  </div>
);

/** The four practice languages on that rail. Shared by the hero and the room. */
export const LanguageRail: FC<{
  practice: LanguageKey;
  onSelect: (language: LanguageKey) => void;
}> = ({ practice, onSelect }) => {
  const intl = useIntl();

  return (
    <ChoiceRail
      items={PRACTICE_LANGUAGES.map((language) => ({
        value: language,
        label: intl.formatMessage(messages.languageName, { language }),
      }))}
      value={practice}
      label={intl.formatMessage(messages.practiceLanguageGroup)}
      onSelect={onSelect}
    />
  );
};

/**
 * The one control that starts and ends a conversation — pearl, because on this
 * black canvas the things you act with are light. Only the visitor may press it;
 * the agent can invite a call and never open one.
 */
export const PearlMic: FC<{
  live: boolean;
  language: LanguageKey;
  onToggle: () => void;
  size?: 'hero' | 'room';
}> = ({ live, language, onToggle, size = 'hero' }) => {
  const intl = useIntl();
  const room = size === 'room';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={intl.formatMessage(live ? messages.endVoice : messages.startVoice, { language })}
      style={{ backgroundImage: PEARL_SURFACE }}
      className={`pointer-events-auto relative flex items-center justify-center rounded-full text-[hsl(var(--pearl-ink))] shadow-[0_10px_40px_-12px_hsl(var(--pearl-2)/0.55),inset_0_2px_2px_hsl(var(--pearl-1)/0.9),inset_0_-3px_6px_hsl(var(--pearl-3)/0.7)] ring-1 ring-foreground/25 transition-transform duration-150 ease-out [touch-action:manipulation] hover:scale-[1.04] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[5px] focus-visible:outline-primary ${
        room ? 'size-36' : 'size-28'
      }`}
    >
      {live ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-foreground/25 motion-reduce:hidden"
        />
      ) : null}
      {live ? (
        <Square size={room ? 34 : 28} aria-hidden="true" />
      ) : (
        <Mic size={room ? 42 : 34} aria-hidden="true" />
      )}
    </button>
  );
};

const BAR_COUNT = 27;

/**
 * The live conversation, drawn in the brand colour: one bar per slot, driven by
 * the REAL audio levels of the session (the platform's meter loop publishes the
 * microphone's and the playback's RMS). Listening rides the microphone level,
 * speaking rides the playback level, so the motion is the conversation itself
 * rather than a decorative loop.
 *
 * The colour sweeps across the row (edges cool, centre icy) instead of per bar,
 * so the row reads as one object. Under `prefers-reduced-motion` it holds a still
 * row at resting height.
 */
export const VoicePulse: FC<{
  muted: boolean;
  onSpeakingChange: (speaking: boolean) => void;
  tall?: boolean;
}> = ({ muted, onSpeakingChange, tall = false }) => {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const speakingRef = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) {
      for (const bar of barsRef.current) {
        if (bar) {
          bar.style.transform = 'scaleY(0.22)';
        }
      }
      return;
    }

    let frame = 0;
    let smoothIn = 0;
    let smoothOut = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      // The meter is noisy per frame; ease toward it so bars breathe, not flicker.
      smoothIn += (realtimeVoiceLevels.input - smoothIn) * 0.22;
      smoothOut += (realtimeVoiceLevels.output - smoothOut) * 0.22;

      const speaking = smoothOut > smoothIn + 0.012;
      if (speaking !== speakingRef.current) {
        speakingRef.current = speaking;
        onSpeakingChange(speaking);
      }

      const level = Math.min(1, Math.max(smoothIn, smoothOut) * 3.4);
      for (let index = 0; index < barsRef.current.length; index += 1) {
        const bar = barsRef.current[index];
        if (!bar) {
          continue;
        }
        const position = index / (BAR_COUNT - 1);
        // A soft arch: the middle of the row carries the loudest motion.
        const arch = 0.35 + 0.65 * Math.sin(position * Math.PI);
        const wobble =
          0.5 + 0.5 * Math.sin(elapsed * (speaking ? 7.5 : 5.2) + index * (speaking ? 0.55 : 0.38));
        const height = 0.12 + arch * (0.1 + level * 0.9) * (0.45 + wobble * 0.55);
        bar.style.transform = `scaleY(${Math.min(1, height).toFixed(3)})`;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onSpeakingChange]);

  return (
    <div
      aria-hidden="true"
      className={`flex w-full items-center justify-center gap-[3px] transition-opacity duration-300 ${
        tall ? 'h-14 max-w-[24rem]' : 'h-9 max-w-[17rem]'
      }`}
      style={{ opacity: muted ? 0.35 : 1 }}
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <span
          key={index}
          ref={(element) => {
            barsRef.current[index] = element;
          }}
          className="h-full w-[3px] flex-none origin-center rounded-full"
          style={{
            transform: 'scaleY(0.12)',
            backgroundColor: `color-mix(in oklab, hsl(var(--learny-aqua-3)) ${Math.round(
              100 - Math.abs(index / (BAR_COUNT - 1) - 0.5) * 190,
            )}%, hsl(var(--learny-aqua-1)))`,
          }}
        />
      ))}
    </div>
  );
};
