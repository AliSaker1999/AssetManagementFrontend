import { useEffect, useRef, useState } from 'react';

/**
 * Animates the displayed number from wherever it currently is to `target`, easing out over
 * `durationMs`. Re-triggers whenever `target` changes (company switch, live refresh) — reads
 * the in-flight display value rather than the last completed one, so a target change mid
 * animation continues smoothly instead of jumping back to the previous start point.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const from = displayRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return Math.round(display);
}
