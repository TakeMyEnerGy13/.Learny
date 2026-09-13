/**
 * The particle flag of the practice language — the one piece of theatre both
 * pages share, drawn on a canvas because it is thousands of triangles a frame.
 *
 * It was written for the hero and moved here when the practice room needed it at
 * a larger size. The flag always fills the WIDTH of whatever box it is given
 * (height follows the 3:2 proportion of a real flag), so the room simply hands it
 * a wider box and the same code draws a bigger flag — nothing is scaled up, the
 * cloud is rebuilt at the new size, so the triangles stay crisp.
 *
 * `clearRadius` is the only size the box cannot tell us: the hole kept clear in
 * the middle for the control that sits on top. The hero's microphone is 112px,
 * the room's is 144px, so each page passes its own.
 */
import { type FC, type MutableRefObject, useEffect, useRef } from 'react';

export type FlagCode = 'es' | 'en' | 'de' | 'ru';

/** Flag colour at normalized flag coordinates — the whole palette of the field. */
export function flagColor(code: FlagCode, u: number, v: number): [number, number, number] {
  if (code === 'es') {
    return v < 0.25 || v > 0.75 ? [226, 26, 44] : [255, 206, 0];
  }
  if (code === 'de') {
    // The black band is lifted off pure black: on this canvas #000 would erase it.
    return v < 1 / 3 ? [104, 104, 104] : v < 2 / 3 ? [240, 12, 12] : [255, 214, 0];
  }
  if (code === 'ru') {
    return v < 1 / 3 ? [250, 250, 252] : v < 2 / 3 ? [24, 78, 200] : [230, 52, 38];
  }
  // Simplified Union Jack: navy field, white-edged saltire, white-edged cross.
  const du = u - 0.5;
  const dv = v - 0.5;
  const saltire = Math.min(Math.abs(dv - du), Math.abs(dv + du));
  if (Math.abs(du) < 0.055 || Math.abs(dv) < 0.085) {
    return [222, 24, 56];
  }
  if (Math.abs(du) < 0.092 || Math.abs(dv) < 0.142) {
    return [250, 250, 252];
  }
  if (saltire < 0.045) {
    return [222, 24, 56];
  }
  if (saltire < 0.095) {
    return [250, 250, 252];
  }
  return [20, 52, 140];
}

interface Particle {
  /** Resting position in CSS pixels. */
  baseX: number;
  baseY: number;
  /** Where it starts the assembly: just behind the control. */
  startX: number;
  startY: number;
  /** Assembly delay in ms — near particles settle first. */
  delay: number;
  /** Current pointer-driven displacement, eased toward its target each frame. */
  pushX: number;
  pushY: number;
  phase: number;
  size: number;
  alpha: number;
  color: string;
}

const PUSH_RADIUS = 130;
const PUSH_STRENGTH = 32;
const ASSEMBLE_MS = 760;

function buildParticles(
  width: number,
  height: number,
  code: FlagCode,
  clearRadius: number,
  dotsAcross: number,
): Particle[] {
  const flagWidth = width;
  const flagHeight = flagWidth / 1.5;
  const originY = (height - flagHeight) / 2;
  // Dots ACROSS the flag, not a fixed pixel step: that is what keeps a wide
  // field as dense as a narrow one. A bigger flag built at the same spacing has
  // the same number of dots spread over more room, which reads as a dimmer,
  // thinner cloud — the room asks for more of them, the hero keeps its own count.
  const step = Math.max(4, Math.round(flagWidth / dotsAcross));
  const centerX = width / 2;
  const centerY = height / 2;
  const hole = clearRadius > 0 ? clearRadius : Math.min(width, height) * 0.17;
  const particles: Particle[] = [];

  for (let y = originY; y <= originY + flagHeight; y += step) {
    for (let x = 0; x <= flagWidth; x += step) {
      // Light jitter only: heavy scatter mixes neighbouring bands into noise.
      const px = x + (Math.random() - 0.5) * step * 0.45;
      const py = y + (Math.random() - 0.5) * step * 0.45;
      const u = px / flagWidth;
      const v = (py - originY) / flagHeight;
      if (u < 0 || u > 1 || v < 0 || v > 1) {
        continue;
      }
      const [r, g, b] = flagColor(code, u, v);
      // Three fades shape the cloud: it thins toward the control so the button
      // never sits on a dense mess, dissolves toward the flag's edges, and
      // falls off elliptically so the field reads as a drifting cloud rather
      // than a rectangle pasted on the canvas.
      const distance = Math.hypot(px - centerX, py - centerY);
      const holeFade = Math.min(1, Math.max(0.3, (distance - hole) / (hole * 0.7)));
      const edgeFade = Math.min(1, Math.min(u, 1 - u, v, 1 - v) / 0.2) ** 1.4;
      const radial = Math.hypot(
        (px - centerX) / (flagWidth * 0.52),
        (py - centerY) / (flagHeight * 0.6),
      );
      const cloudFade = Math.min(1, Math.max(0, 1.12 - radial)) ** 1.1;
      const alpha = (0.55 + 0.45 * holeFade) * edgeFade * cloudFade;
      if (alpha < 0.05) {
        continue;
      }
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnRadius = Math.random() * hole * 0.75;
      particles.push({
        baseX: px,
        baseY: py,
        startX: centerX + Math.cos(spawnAngle) * spawnRadius,
        startY: centerY + Math.sin(spawnAngle) * spawnRadius,
        delay: distance * 1.5 + Math.random() * 90,
        pushX: 0,
        pushY: 0,
        phase: Math.random() * Math.PI * 2,
        size: 1.8 + Math.random() * 1.5,
        alpha,
        color: `${r}, ${g}, ${b}`,
      });
    }
  }
  return particles;
}

export const FlagField: FC<{
  code: FlagCode;
  label: string;
  /** Pointer position in field-local CSS pixels, owned by the parent so that
   *  moves over the voice control still steer the field. */
  pointer: MutableRefObject<{ x: number; y: number } | null>;
  /** Radius kept clear in the middle for the control on top, in CSS pixels. */
  clearRadius?: number;
  /**
   * How many dots span the flag's width — the field's density, and the ONLY way
   * to change it. The default is the hero's, which must not move: the landing
   * page's flag was tuned against its headline and its column. The practice room
   * passes a higher number because its flag is far wider, and the same count
   * spread over that area looked faded.
   */
  dotsAcross?: number;
}> = ({ code, label, pointer: pointerRef, clearRadius = 0, dotsAcross = 62 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let assembleStart = 0;

    const draw = (elapsed: number, assembled: boolean) => {
      context.clearRect(0, 0, width, height);
      // Additive blending: on a black canvas overlapping particles build up
      // light instead of muddying each other, so the flag reads vivid.
      context.globalCompositeOperation = 'lighter';
      const pointer = pointerRef.current;
      for (const particle of particles) {
        // Assembly: stream out from behind the control, settle, then live.
        const raw = assembled
          ? 1
          : Math.min(1, Math.max(0, (elapsed - assembleStart - particle.delay) / ASSEMBLE_MS));
        if (raw <= 0) {
          continue;
        }
        const settle = 1 - (1 - raw) ** 3;

        let targetX = 0;
        let targetY = 0;
        if (pointer && raw === 1) {
          const dx = particle.baseX - pointer.x;
          const dy = particle.baseY - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < PUSH_RADIUS && distance > 0.001) {
            const force = (1 - distance / PUSH_RADIUS) ** 2 * PUSH_STRENGTH;
            targetX = (dx / distance) * force;
            targetY = (dy / distance) * force;
          }
        }
        particle.pushX += (targetX - particle.pushX) * 0.12;
        particle.pushY += (targetY - particle.pushY) * 0.12;

        const driftX = Math.sin(elapsed * 0.00072 + particle.phase) * 2.4;
        const driftY = Math.cos(elapsed * 0.00061 + particle.phase * 1.3) * 2.4;
        const restX = particle.baseX + particle.pushX + driftX * settle;
        const restY = particle.baseY + particle.pushY + driftY * settle;
        const x = particle.startX + (restX - particle.startX) * settle;
        const y = particle.startY + (restY - particle.startY) * settle;
        const s = particle.size * (0.45 + 0.55 * settle);

        context.beginPath();
        context.moveTo(x, y - s);
        context.lineTo(x + s * 0.87, y + s * 0.55);
        context.lineTo(x - s * 0.87, y + s * 0.55);
        context.closePath();
        context.fillStyle = `rgba(${particle.color}, ${particle.alpha * settle})`;
        context.fill();
      }
    };

    const loop = (time: number) => {
      if (assembleStart === 0) {
        assembleStart = time;
      }
      draw(time, false);
      frame = window.requestAnimationFrame(loop);
    };

    const measure = () => {
      const rect = parent.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
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
      particles = buildParticles(width, height, code, clearRadius, dotsAcross);
      if (reduceMotion) {
        // One still frame: the flag is present and complete, nothing moves.
        pointerRef.current = null;
        draw(0, true);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);

    if (!reduceMotion) {
      frame = window.requestAnimationFrame(loop);
    }

    return () => {
      observer.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [code, clearRadius, dotsAcross]);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} role="img" aria-label={label} className="h-full w-full" />
    </div>
  );
};
