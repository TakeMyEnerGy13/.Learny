/**
 * Lifting the boot curtain — the dotted hands in `static/index.html` that cover
 * the void until there is something real underneath.
 *
 * EVERY screen must call this, not just the landing page. A session is replayed
 * from its history on reload, so whichever screen the visitor was last on is the
 * one that mounts first — the arrival questions, the practice room, the hero. When
 * only one of them lifted the curtain, a reload in the practice room sat behind
 * the hands until the curtain's own safety timeout let go.
 *
 * Dismissing twice is harmless; the curtain ignores it once it is out.
 *
 * `when` lets a screen HOLD the curtain for one short async answer it cannot draw
 * without — the arrival screen waits to learn whether this is a returning learner,
 * so a first-time question never flashes up and gets replaced. Keep such waits to a
 * single round-trip; the curtain has its own safety timeout, but a screen that holds
 * it deliberately should not be the reason that timeout fires.
 */
import { useEffect } from 'react';

export function useDismissBootCurtain(when = true): void {
  useEffect(() => {
    if (!when) {
      return;
    }
    (window as unknown as { __learnyPreloader?: { dismiss(): void } }).__learnyPreloader?.dismiss();
  }, [when]);
}
