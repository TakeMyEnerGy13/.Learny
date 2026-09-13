/**
 * Four phrases, one particle field: the cloud holds a phrase, then tears itself
 * apart and reassembles as the next one — «Привет, друг!» · Vamos · Lernen ·
 * Let's talk!, one per language the agent practises.
 *
 * It is the hero flag's engine seen from a different angle, deliberately: same
 * triangle particles, same additive blending on black, same pointer push, same
 * single still frame under `prefers-reduced-motion`. What differs is where the
 * target positions come from — glyphs sampled from an offscreen canvas instead
 * of a flag's colour bands — and that the field never comes to rest: it morphs
 * on a loop, which is the "same but not quite" the hero cannot do.
 *
 * The phrases are DATA, not interface copy: they are foreign words shown to
 * every visitor in every locale (like the flags), so they are never translated
 * and never become message descriptors.
 */
import { type FC, useEffect, useRef } from 'react';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  label: {
    id: 'mechanics.phrases.alt',
    defaultMessage:
      'Particles reassemble between four phrases: «Привет, друг!», «Vamos», «Lernen», «Let\u2019s talk!»',
    description:
      'Accessible description of the decorative particle animation above the voice-mechanics section. Keep the four phrases themselves untranslated — they are shown as-is in their own languages.',
  },
});

const PHRASES = ['Привет, друг!', 'Vamos', 'Lernen', "Let's talk!"] as const;

/** How long a phrase stands still, and how long the reassembly takes. The hold
 *  dominates on purpose: the phrases are the point, the flight between them is
 *  punctuation. */
const HOLD_MS = 4200;
const MORPH_MS = 900;
const CYCLE_MS = HOLD_MS + MORPH_MS;

const PUSH_RADIUS = 96;
const PUSH_STRENGTH = 18;

/** The brand gradient as particle colour, left to right: azure into pale cyan.
 *  Kept in the gradient's brighter half — the darkest azure disappears against
 *  the void once it is broken into 3px triangles. */
const AQUA_STOPS: Array<[number, number, number]> = [
  [72, 198, 250],
  [148, 232, 253],
  [231, 252, 255],
];

function aquaAt(u: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, u)) * (AQUA_STOPS.length - 1);
  const i = Math.min(AQUA_STOPS.length - 2, Math.floor(t));
  const f = t - i;
  const a = AQUA_STOPS[i];
  const b = AQUA_STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

interface Point {
  x: number;
  y: number;
}

interface Particle {
  /** Sideways bow of the flight path, so a morph swirls instead of sliding. */
  curl: number;
  phase: number;
  size: number;
  alpha: number;
  pushX: number;
  pushY: number;
}

/**
 * Glyph sampling: draw the phrase once on an offscreen canvas, then keep a grid
 * of the pixels it covered. Reading pixels back is why the phrases can be any
 * script — the sampler never needs to know about letterforms, and Cyrillic,
 * Latin and punctuation all arrive as coverage.
 */
function samplePhrase(phrase: string, width: number, height: number, step: number): Point[] {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(width));
  off.height = Math.max(1, Math.round(height));
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return [];
  }
  let size = Math.round(height * 0.62);
  const font = (px: number) => `600 ${px}px Geist, -apple-system, sans-serif`;
  ctx.font = font(size);
  // Shrink to fit: «Привет, друг!» is three times the width of «Vamos», and a
  // phrase clipped at the column edge would look like a bug, not a design.
  while (size > 14 && ctx.measureText(phrase).width > width * 0.9) {
    size -= 2;
    ctx.font = font(size);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(phrase, off.width / 2, off.height / 2);

  const { data } = ctx.getImageData(0, 0, off.width, off.height);
  const points: Point[] = [];
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      if (data[(y * off.width + x) * 4 + 3] > 140) {
        points.push({
          x: x + (Math.random() - 0.5) * step * 0.8,
          y: y + (Math.random() - 0.5) * step * 0.8,
        });
      }
    }
  }
  return points;
}

/** Fisher-Yates: a shuffled route makes the cloud swirl on its way over. */
function shuffled(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export const PhraseParticles: FC = () => {
  const intl = useIntl();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let width = 0;
    let height = 0;
    let frame = 0;
    let particles: Particle[] = [];
    let shapes: Point[][] = [];
    /** Per phrase, which sampled point each particle occupies. Fixed for the
     *  life of the field: a route re-rolled every frame would boil. */
    let routes: number[][] = [];

    const build = () => {
      // Density is what makes the phrase READ as a phrase rather than as dust:
      // roughly a 4px lattice over the glyph coverage, which lands around two
      // to three thousand particles at this strip's size.
      const step = Math.max(3, Math.round(height / 40));
      shapes = PHRASES.map((phrase) => samplePhrase(phrase, width, height, step));
      const pool = Math.max(...shapes.map((shape) => shape.length), 1);
      particles = Array.from({ length: pool }, () => ({
        // A third of the strip's height of bow: enough that the cloud visibly
        // arcs across, not so much that it sprays into a shapeless band.
        curl: (Math.random() - 0.5) * height * 0.3,
        phase: Math.random() * Math.PI * 2,
        size: 1.8 + Math.random() * 1.3,
        alpha: 0.68 + Math.random() * 0.32,
        pushX: 0,
        pushY: 0,
      }));
      // Particle 12 holds an unrelated point in each phrase, so the field
      // crosses over as a swirl rather than sliding letter into letter.
      routes = shapes.map((shape) =>
        shuffled(pool).map((index) => (shape.length > 0 ? index % shape.length : 0)),
      );
    };

    /**
     * The animation is a pure function of the clock: which phrase shows, and how
     * far its reassembly has come, are derived from `time` alone. Nothing is
     * remembered between frames, so a rebuild — a resize, a late webfont — can
     * never leave the field stuck on one phrase. An earlier version kept that
     * state in the closure and did exactly that: the resize observer reset the
     * phrase index on every callback, so «Привет, друг!» morphed into itself
     * forever.
     */
    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      // Additive blending, as in the hero: overlapping particles build up light
      // on black rather than muddying each other.
      context.globalCompositeOperation = 'lighter';
      if (particles.length === 0 || shapes.length === 0) {
        return;
      }

      const cycles = Math.floor(time / CYCLE_MS);
      const current = cycles % shapes.length;
      const next = (current + 1) % shapes.length;
      const within = time - cycles * CYCLE_MS;
      const progress = within <= HOLD_MS ? 0 : Math.min(1, (within - HOLD_MS) / MORPH_MS);
      const eased = progress * progress * (3 - 2 * progress);
      const bow = Math.sin(eased * Math.PI);
      const from = shapes[current];
      const to = shapes[next];
      if (from.length === 0 || to.length === 0) {
        return;
      }
      const pointer = pointerRef.current;

      particles.forEach((particle, i) => {
        const source = from[routes[current][i]];
        const target = to[routes[next][i]];
        const baseX = source.x + (target.x - source.x) * eased;
        const baseY = source.y + (target.y - source.y) * eased + particle.curl * bow;

        let targetPushX = 0;
        let targetPushY = 0;
        if (pointer) {
          const dx = baseX - pointer.x;
          const dy = baseY - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < PUSH_RADIUS && distance > 0.001) {
            const force = (1 - distance / PUSH_RADIUS) ** 2 * PUSH_STRENGTH;
            targetPushX = (dx / distance) * force;
            targetPushY = (dy / distance) * force;
          }
        }
        particle.pushX += (targetPushX - particle.pushX) * 0.12;
        particle.pushY += (targetPushY - particle.pushY) * 0.12;

        const x = baseX + particle.pushX + Math.sin(time * 0.0008 + particle.phase) * 1.8;
        const y = baseY + particle.pushY + Math.cos(time * 0.0007 + particle.phase * 1.3) * 1.8;
        // Mid-flight the cloud thins out, so the reassembly reads as a breath
        // rather than a block of text sliding sideways.
        const alpha = particle.alpha * (1 - 0.45 * bow);
        const [r, g, b] = aquaAt(width > 0 ? x / width : 0.5);
        const s = particle.size * (1 - 0.2 * bow);

        context.beginPath();
        context.moveTo(x, y - s);
        context.lineTo(x + s * 0.87, y + s * 0.55);
        context.lineTo(x - s * 0.87, y + s * 0.55);
        context.closePath();
        context.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
        context.fill();
      });
    };

    const loop = (time: number) => {
      draw(time);
      frame = window.requestAnimationFrame(loop);
    };

    const measure = () => {
      const rect = parent.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        return;
      }
      // Rebuild only on a real size change: re-sampling four phrases on every
      // observer callback is wasted work, and any layout feedback would turn it
      // into a loop that never settles.
      if (Math.abs(rect.width - width) < 1 && Math.abs(rect.height - height) < 1) {
        return;
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      build();
      if (reduceMotion) {
        // One phrase, complete and still: no loop, no pointer interaction.
        pointerRef.current = null;
        draw(0);
      }
    };

    const start = () => {
      if (disposed) {
        return;
      }
      measure();
      if (!reduceMotion) {
        frame = window.requestAnimationFrame(loop);
      }
    };

    // Sampling before the webfont lands would trace the fallback face, and the
    // phrases would silently change shape a moment later.
    if (document.fonts?.status === 'loaded') {
      start();
    } else {
      void document.fonts?.ready.then(start);
    }

    const observer = new ResizeObserver(() => {
      if (!disposed && width > 0) {
        measure();
      }
    });
    observer.observe(parent);

    return () => {
      disposed = true;
      observer.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <div
      className="relative h-[104px] w-full sm:h-[132px] lg:h-[156px]"
      role="img"
      aria-label={intl.formatMessage(messages.label)}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      }}
      onPointerLeave={() => {
        pointerRef.current = null;
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />
    </div>
  );
};
