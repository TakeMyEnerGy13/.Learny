/**
 * The firefly trail: a path threaded through the zigzagging steps of the third
 * section, drawn by the page's own scroll, with a small swarm of fireflies at
 * its head.
 *
 * The scroll IS the animation. There is no timer and no rAF loop of its own —
 * scrolling schedules one frame, that frame moves the swarm and lengthens the
 * lit part of the path, and nothing happens while the page is still. The only
 * self-running motion is each firefly's twinkle, which is a CSS keyframe on the
 * element, so the browser owns it off the main thread.
 *
 * Geometry comes from the DOM rather than from constants: the path is measured
 * through the anchor element of every step, so it follows the zigzag at any
 * breakpoint and re-measures when the layout moves. Nothing here reads or writes
 * React state on scroll — attributes are set on the SVG directly, because a
 * re-render per frame of scrolling is exactly the kind of jank that would be
 * felt in the hero's voice control on the same page.
 *
 * Reduced motion gets the path fully drawn and a still firefly resting on each
 * step: the same information, none of the movement.
 */
import { type FC, type RefObject, useEffect, useRef } from 'react';

/** Fireflies in the swarm, and how far behind the head each one trails. */
const FIREFLY_COUNT = 5;
const FIREFLY_LAG = 0.035;

interface FireflyTrailProps {
  /** The box the trail is drawn over — the steps grid. */
  container: RefObject<HTMLElement | null>;
  /** One element per step; the trail passes through the centre of each. */
  anchors: RefObject<Array<HTMLElement | null>>;
  /** Called when the swarm reaches a new step, so it can light up. -1 = none. */
  onReach?: (index: number) => void;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * A smooth path through the anchors: each leg is a cubic whose control points
 * sit halfway down the leg, which turns the zigzag into a single flowing line
 * instead of a chain of corners.
 */
function buildPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return '';
  }
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const mid = (a.y + b.y) / 2;
    d += ` C ${a.x.toFixed(1)} ${mid.toFixed(1)}, ${b.x.toFixed(1)} ${mid.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

export const FireflyTrail: FC<FireflyTrailProps> = ({ container, anchors, onReach }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseRef = useRef<SVGPathElement | null>(null);
  const litRef = useRef<SVGPathElement | null>(null);
  const swarmRef = useRef<Array<SVGGElement | null>>([]);
  const reachedRef = useRef(-1);

  useEffect(() => {
    const host = container.current;
    const svg = svgRef.current;
    const base = baseRef.current;
    const lit = litRef.current;
    if (!host || !svg || !base || !lit) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let frame = 0;
    let length = 0;
    /** Where along the path each step sits, 0..1 — used to light the steps. */
    let stops: number[] = [];

    const measure = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        return;
      }
      const points = (anchors.current ?? [])
        .filter((element): element is HTMLElement => element != null)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            x: box.left - rect.left + box.width / 2,
            y: box.top - rect.top + box.height / 2,
          };
        });
      if (points.length < 2) {
        return;
      }

      svg.setAttribute('viewBox', `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`);
      const d = buildPath(points);
      base.setAttribute('d', d);
      lit.setAttribute('d', d);
      length = lit.getTotalLength();
      lit.style.strokeDasharray = `${length}`;
      lit.style.strokeDashoffset = `${length}`;

      // Straight-line distance is a close enough stand-in for arc length here,
      // and it only decides WHEN a step lights up.
      const legs = points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
      const total = legs.reduce((sum, leg) => sum + leg, 0) || 1;
      let walked = 0;
      stops = [0, ...legs.map((leg) => (walked += leg) / total)];

      if (reduceMotion) {
        // Everything already arrived: the whole path lit, one firefly resting on
        // each step, and no scroll listener at all.
        lit.style.strokeDashoffset = '0';
        swarmRef.current.forEach((group, i) => {
          const stop = stops[Math.min(i, stops.length - 1)] ?? 0;
          const point = lit.getPointAtLength(stop * length);
          group?.setAttribute('transform', `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
          group?.setAttribute('opacity', '0.8');
        });
        onReach?.(stops.length - 1);
      }
    };

    const paint = () => {
      frame = 0;
      const rect = host.getBoundingClientRect();
      if (length === 0 || rect.height < 1) {
        return;
      }
      // The trail advances with the reader: it starts when the block's top comes
      // up past 85% of the window and completes as its bottom clears the top
      // quarter, so the swarm keeps pace with the eye rather than with the
      // scrollbar's absolute position.
      const enter = window.innerHeight * 0.85;
      const exit = window.innerHeight * 0.2;
      const span = rect.height + (enter - exit);
      const progress = clamp01((enter - rect.top) / (span || 1));

      lit.style.strokeDashoffset = `${length * (1 - progress)}`;
      svg.style.opacity = '1';

      swarmRef.current.forEach((group, i) => {
        if (!group) {
          return;
        }
        const at = clamp01(progress - i * FIREFLY_LAG);
        const point = lit.getPointAtLength(at * length);
        group.setAttribute('transform', `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
        // The tail fades out behind the head, and the whole swarm fades in as it
        // sets off so it does not simply appear at the first step.
        const lead = 1 - i / (FIREFLY_COUNT + 1);
        group.setAttribute('opacity', (Math.min(1, progress * 6) * lead).toFixed(2));
      });

      // A step lights up once the swarm is on it. The first one needs the scroll
      // to have actually started, or it would arrive already lit on load.
      const reached =
        progress < 0.04
          ? -1
          : stops.reduce((last, stop, index) => (progress >= stop - 0.02 ? index : last), -1);
      if (reached !== reachedRef.current) {
        reachedRef.current = reached;
        onReach?.(reached);
      }
    };

    const schedule = () => {
      if (!disposed && frame === 0) {
        frame = window.requestAnimationFrame(paint);
      }
    };

    measure();
    if (reduceMotion) {
      return () => {
        disposed = true;
      };
    }

    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    const observer = new ResizeObserver(() => {
      if (!disposed) {
        measure();
        schedule();
      }
    });
    observer.observe(host);

    return () => {
      disposed = true;
      window.removeEventListener('scroll', schedule);
      observer.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [anchors, container, onReach]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible opacity-0 transition-opacity duration-500"
    >
      <defs>
        <linearGradient id="learny-trail-lit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(202, 92%, 56%)" stopOpacity="0.15" />
          <stop offset="45%" stopColor="hsl(194, 96%, 70%)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="hsl(188, 100%, 94%)" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* The path the reader has not reached yet: barely there, so the shape of
          the walk is hinted at rather than announced. */}
      <path ref={baseRef} fill="none" stroke="hsl(0 0% 100% / 0.07)" strokeWidth="1" />
      {/* The same path, lit as far as the scroll has come. */}
      <path
        ref={litRef}
        fill="none"
        stroke="url(#learny-trail-lit)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />

      {Array.from({ length: FIREFLY_COUNT }, (_, i) => (
        <g
          key={i}
          ref={(element) => {
            swarmRef.current[i] = element;
          }}
          opacity="0"
        >
          <g className="learny-firefly" style={{ animationDelay: `${i * 260}ms` }}>
            {/* Halo, body, spark: three circles instead of a blur filter, which
                on a long path is far cheaper for the compositor. */}
            <circle r={9 - i} fill="hsl(194, 96%, 70%)" opacity="0.1" />
            <circle r={3.6 - i * 0.3} fill="hsl(188, 100%, 94%)" opacity="0.55" />
            <circle r={1.5} fill="#ffffff" opacity="0.95" />
          </g>
        </g>
      ))}
    </svg>
  );
};
