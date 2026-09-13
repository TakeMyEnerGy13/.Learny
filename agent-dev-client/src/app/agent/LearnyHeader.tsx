/**
 * Learny.ai's site header.
 *
 * Three things only: the wordmark — the logo, ".Learny" set in Abril Fatface, and
 * also the way back to the landing page — the interface-language switcher, and the
 * gradient control that goes straight to the conversation.
 *
 * The switcher is mechanical on purpose: pressing a language proposes it as
 * this visitor's session locale straight over the socket, so the interface
 * re-renders without spending an agent turn. It changes the INTERFACE only.
 * Which language the visitor practises out loud is a separate choice that
 * lives on the hero and in the practice room, and neither one ever moves the other.
 *
 * The two navigation controls are NOT mechanical: the header sits outside every
 * surface, so it cannot dispatch a surface action. Each sends what a visitor would
 * type as their own message, which is the platform's own path for a tapped intent
 * and costs the same single agent turn a button on the page does.
 */
import { useEffect, type FC } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { cn } from '@/app/lib/utils';
import type { AgentHeaderProps } from '@/app/lib/stage/StageHeader.tsx';
import { useLocalization } from '@/app/lib/localization/LocalizationProvider.tsx';
import { wsManager } from '@/app/lib/services/websocket-manager.ts';
import { useMessagingStore } from '@/app/lib/hooks';
import { realtimeVoiceLevels } from '@/app/lib/services/voice-realtime.service.ts';

const messages = defineMessages({
  interfaceLanguage: {
    id: 'header.interfaceLanguage.group',
    defaultMessage: 'Interface language',
    description: 'Accessible group name of the header control that switches the interface language.',
  },
  switchInterface: {
    id: 'header.interfaceLanguage.switch',
    defaultMessage: 'Show the interface in {language}',
    description:
      'Accessible name of one interface-language button. {language} is the language name in its own language.',
  },
  toPractice: {
    id: 'header.toPractice',
    defaultMessage: 'Practise',
    description:
      'Header control that takes the visitor from anywhere on the site to the practice room.',
  },
  toPracticeIntent: {
    id: 'header.toPractice.intent',
    defaultMessage: 'Open the practice room',
    description:
      'What the header practise control says to the agent on the visitor’s behalf. Plain sentence, ' +
      'as a visitor would type it — it is sent as their own message.',
  },
  toHome: {
    id: 'header.toHome',
    defaultMessage: 'Back to the {brand} home page',
    description:
      'Accessible name of the wordmark, which takes the visitor to the landing page. {brand} is the ' +
      'site name.',
  },
  toHomeIntent: {
    id: 'header.toHome.intent',
    defaultMessage: 'Show me the home page',
    description:
      'What the wordmark says to the agent on the visitor’s behalf. Plain sentence, as a visitor ' +
      'would type it — it is sent as their own message.',
  },
});

/** The interface languages the site is offered in, in display order. */
const UI_LOCALES = ['en', 'ru', 'es', 'de'] as const;

/** "ru-RU" and "ru" are the same offer as far as this switcher is concerned. */
function primarySubtag(locale: string): string {
  return locale.toLowerCase().split('-')[0] ?? locale;
}

function endonym(locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale.toUpperCase();
  } catch {
    return locale.toUpperCase();
  }
}

/**
 * Publishes the live voice amplitude as CSS custom properties on the document.
 *
 * The input dock is shell chrome: a screen may not position anything over it,
 * and the equaliser inside it is drawn on a canvas by platform code. What our
 * theme CAN do is hide that canvas and paint the same slot itself — but CSS has
 * no way to hear the conversation. So this bridge carries the numbers.
 *
 * `--learny-voice-amp` is the current level and `--learny-voice-glow` says which
 * side is talking; `--learny-voice-0…10` are a trail of recent levels, newest
 * first. `theme.css` mirrors that trail around the centre of the strip, so the
 * bar under the middle is what is being said right now and the ones beside it
 * are the moments just before — every bar a real measurement, travelling
 * outward. Nothing here loops when the room is quiet.
 *
 * It lives in the header because the header is always mounted — the strip keeps
 * working after the visitor scrolls away from the hero or opens another screen.
 * The loop only runs while a voice channel is open, and zeroes on the way out.
 */
const VOICE_TRAIL = 11;

function useVoiceAmplitudeBridge(): void {
  const store = useMessagingStore();
  const live = store.speechEnabled;

  useEffect(() => {
    const root = document.documentElement.style;
    const clear = () => {
      root.setProperty('--learny-voice-amp', '0');
      root.setProperty('--learny-voice-glow', '0');
      for (let i = 0; i < VOICE_TRAIL; i += 1) root.setProperty(`--learny-voice-${i}`, '0');
    };

    if (!live) {
      clear();
      return;
    }

    let frame = 0;
    // Smoothed so the strip breathes instead of flickering frame to frame.
    let amp = 0;
    let glow = 0;
    // Raw microphone levels vary wildly between rooms and headsets, so the
    // strip is normalised against a decaying peak — the same auto-gain idea the
    // platform's own waveform uses. A quiet speaker fills the bars too.
    let peak = 0.02;
    const trail = new Float32Array(VOICE_TRAIL);
    let lastStep = 0;

    const tick = (now: number) => {
      const speaking = store.isAISpeaking;
      const level = speaking ? realtimeVoiceLevels.output : realtimeVoiceLevels.input;
      peak = Math.max(peak * 0.995, level, 0.02);
      const activity = Math.min(1, level / peak);
      // Fast to rise, slow to fall: syllables read as peaks, not as mush.
      amp += (activity - amp) * (activity > amp ? 0.4 : 0.12);
      glow += ((speaking ? 1 : 0) - glow) * 0.12;

      // The trail advances on its own clock — one step per ~55ms, so the wave
      // travels at a readable speed regardless of the display's refresh rate.
      if (now - lastStep > 55) {
        for (let i = VOICE_TRAIL - 1; i > 0; i -= 1) trail[i] = (trail[i - 1] ?? 0) * 0.95;
        trail[0] = amp;
        lastStep = now;
        for (let i = 0; i < VOICE_TRAIL; i += 1) {
          // Tapered outward so the cluster ends in fine hairlines, not a wall.
          const shaped = (trail[i] ?? 0) * (1 - i * 0.055);
          root.setProperty(`--learny-voice-${i}`, shaped.toFixed(3));
        }
      }

      root.setProperty('--learny-voice-amp', amp.toFixed(3));
      root.setProperty('--learny-voice-glow', glow.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      clear();
    };
  }, [live, store]);
}

export const LearnyHeader: FC<AgentHeaderProps> = ({ brandName, navItems, onNavigate }) => {
  const intl = useIntl();
  const localization = useLocalization();
  const store = useMessagingStore();
  const active = primarySubtag(localization.messageLocale);
  useVoiceAmplitudeBridge();

  return (
    // No rule under the header on purpose. The theme's `--border` is a tinted
    // azure, so a hairline here read as a blue line drawn across the void and
    // broke the one-black-field look. The header is separated by air alone; the
    // blur keeps the wordmark legible over anything that scrolls beneath it.
    <header className="flex-none bg-background/80 px-5 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:px-20">
      <div className="mx-auto flex w-full max-w-container-content items-center gap-x-4 py-3 sm:py-4">
        {/*
          The wordmark is also the way home — the convention every site on the web
          has trained visitors in, and now the only one: the practice room's own
          "back to the site" link was removed to keep that page on a single screen.

          Like the practise control it cannot dispatch a surface action from out here,
          so it says what a visitor would type ("show me the home page") as their own
          message. It looks exactly as it did — a logo, not a button.
        */}
        <button
          type="button"
          aria-label={intl.formatMessage(messages.toHome, { brand: brandName })}
          onClick={() => {
            void store.sendMessage({
              instruction: intl.formatMessage(messages.toHomeIntent),
            });
          }}
          className="learny-wordmark learny-aqua-text flex-none cursor-pointer whitespace-nowrap bg-transparent text-2xl leading-none transition-opacity duration-300 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-primary motion-reduce:transition-none sm:text-[1.75rem]"
          translate="no"
        >
          {brandName}
        </button>

        {navItems.length > 0 ? (
          <nav
            className="scrollbar-none ml-auto hidden min-w-0 items-center gap-1 overflow-x-auto sm:flex"
            aria-label={brandName}
          >
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex-none cursor-pointer touch-manipulation whitespace-nowrap rounded-sm bg-transparent px-3 py-2 text-xs font-semibold uppercase tracking-caps text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary data-[active=true]:text-primary"
                data-active={item.active === true}
                onClick={() => onNavigate(item)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}

        <div
          role="group"
          aria-label={intl.formatMessage(messages.interfaceLanguage)}
          className={cn('flex flex-none items-center gap-0.5', navItems.length > 0 ? '' : 'ml-auto')}
        >
          {UI_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              lang={locale}
              aria-pressed={active === locale}
              aria-label={intl.formatMessage(messages.switchInterface, {
                language: endonym(locale),
              })}
              onClick={() => {
                if (active === locale) {
                  return;
                }
                void wsManager.proposeLocale(locale).catch(() => undefined);
              }}
              className={cn(
                'cursor-pointer touch-manipulation rounded-full bg-transparent px-2.5 py-1.5 text-xs font-semibold uppercase tracking-caps transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary',
                active === locale
                  ? 'text-foreground'
                  : 'text-muted-foreground-subtle hover:text-foreground',
              )}
            >
              <span translate="no">{locale}</span>
            </button>
          ))}
        </div>

        {/*
          Straight to the conversation, from anywhere on the site — the header is
          always mounted, so this works while the visitor is halfway down the
          landing page.

          It cannot be a surface action: the header lives outside every surface, so
          it says what a visitor would type ("open the practice room") as their own
          message, which is the platform's own path for a tapped intent. That
          spends one agent turn, exactly like the button on the page does.

          Owner decision: the SAME gradient fill as the landing page's call to
          action. A quieter hairline version made the always-present door look like
          the lesser one; both lead to the same conversation, so both look it.
        */}
        <button
          type="button"
          onClick={() => {
            void store.sendMessage({
              instruction: intl.formatMessage(messages.toPracticeIntent),
            });
          }}
          className="learny-aqua-fill learny-header-cta ml-1 flex-none cursor-pointer touch-manipulation whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-caps focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary"
        >
          {intl.formatMessage(messages.toPractice)}
        </button>
      </div>
    </header>
  );
};
