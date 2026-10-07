import { useRef, useEffect, useCallback, useState } from 'react';

export interface UseInertiaScrollOptions {
  /** Direction of scrolling to apply momentum to: 'x', 'y', or 'both' (default 'x') */
  direction?: 'x' | 'y' | 'both';
  /** Friction deceleration factor between 0.90 and 0.98 (default 0.95) */
  friction?: number;
  /** Whether to enable smooth momentum wheel smoothing (default true) */
  smoothWheel?: boolean;
  /** Whether dragging requires holding spacebar or middle click (default false for drag handles) */
  requireModifier?: boolean;
}

interface PointerHistoryItem {
  x: number;
  y: number;
  time: number;
}

export function useInertiaScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseInertiaScrollOptions = {}
) {
  const {
    direction = 'x',
    friction = 0.95,
    smoothWheel = true,
  } = options;

  const containerRef = useRef<T | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const wheelRafIdRef = useRef<number | null>(null);

  const isDraggingRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startScrollRef = useRef({ left: 0, top: 0 });
  const historyRef = useRef<PointerHistoryItem[]>([]);
  const [isPanning, setIsPanning] = useState(false);

  // Stop any active momentum animations
  const stopMomentum = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const stopWheelMomentum = useCallback(() => {
    if (wheelRafIdRef.current !== null) {
      cancelAnimationFrame(wheelRafIdRef.current);
      wheelRafIdRef.current = null;
    }
  }, []);

  // Momentum coasting loop
  const startMomentum = useCallback(
    (vx: number, vy: number) => {
      stopMomentum();
      const el = containerRef.current;
      if (!el) return;

      let currentVx = vx;
      let currentVy = vy;
      let lastTime = performance.now();

      const loop = (now: number) => {
        const dt = Math.min(now - lastTime, 32);
        lastTime = now;

        // Apply decay
        const decay = Math.pow(friction, dt / 16);
        currentVx *= decay;
        currentVy *= decay;

        if (direction === 'x' || direction === 'both') {
          el.scrollLeft -= currentVx * dt;
        }
        if (direction === 'y' || direction === 'both') {
          el.scrollTop -= currentVy * dt;
        }

        // Check if velocity is still significant and not hit bounds
        const stillMovingX = Math.abs(currentVx) > 0.05;
        const stillMovingY = Math.abs(currentVy) > 0.05;

        if (
          (direction === 'x' && stillMovingX) ||
          (direction === 'y' && stillMovingY) ||
          (direction === 'both' && (stillMovingX || stillMovingY))
        ) {
          rafIdRef.current = requestAnimationFrame(loop);
        } else {
          rafIdRef.current = null;
          setIsPanning(false);
        }
      };

      rafIdRef.current = requestAnimationFrame(loop);
    },
    [direction, friction, stopMomentum]
  );

  // Drag handlers for pointer-based drag-to-scroll
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Allow primary button or middle button (button 1)
      if (e.button !== 0 && e.button !== 1) return;
      const el = containerRef.current;
      if (!el) return;

      stopMomentum();
      stopWheelMomentum();

      isDraggingRef.current = true;
      setIsPanning(true);
      startPointerRef.current = { x: e.clientX, y: e.clientY };
      startScrollRef.current = { left: el.scrollLeft, top: el.scrollTop };

      const now = performance.now();
      historyRef.current = [{ x: e.clientX, y: e.clientY, time: now }];

      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture not supported or already captured
      }
    },
    [stopMomentum, stopWheelMomentum]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;

    if (direction === 'x' || direction === 'both') {
      el.scrollLeft = startScrollRef.current.left - dx;
    }
    if (direction === 'y' || direction === 'both') {
      el.scrollTop = startScrollRef.current.top - dy;
    }

    const now = performance.now();
    historyRef.current.push({ x: e.clientX, y: e.clientY, time: now });

    // Keep history to last 120ms
    if (historyRef.current.length > 10) {
      historyRef.current.shift();
    }
  }, [direction]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // release failure ignored
      }

      const now = performance.now();
      const recent = historyRef.current.filter((item) => now - item.time < 120);

      if (recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        const dt = last.time - first.time;

        if (dt > 10) {
          const vx = (last.x - first.x) / dt;
          const vy = (last.y - first.y) / dt;
          startMomentum(vx, vy);
          return;
        }
      }

      setIsPanning(false);
    },
    [startMomentum]
  );

  // Smooth momentum wheel handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !smoothWheel) return;

    let wheelVelocityX = 0;
    let wheelVelocityY = 0;
    let isWheeling = false;

    const runWheelMomentum = () => {
      if (!isWheeling) return;

      wheelVelocityX *= 0.92;
      wheelVelocityY *= 0.92;

      if (direction === 'x' || direction === 'both') {
        el.scrollLeft += wheelVelocityX;
      }
      if (direction === 'y' || direction === 'both') {
        el.scrollTop += wheelVelocityY;
      }

      if (Math.abs(wheelVelocityX) > 0.2 || Math.abs(wheelVelocityY) > 0.2) {
        wheelRafIdRef.current = requestAnimationFrame(runWheelMomentum);
      } else {
        isWheeling = false;
        wheelRafIdRef.current = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // If user scrolls horizontally or Shift + vertical scroll
      const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      const deltaY = !e.shiftKey ? e.deltaY : 0;

      // Only take over if there's horizontal scrollable space when scrolling horizontally
      if (direction === 'x' && Math.abs(deltaX) > 0) {
        if (el.scrollWidth > el.clientWidth) {
          e.preventDefault();
          stopMomentum();

          // Accelerate smoothly
          wheelVelocityX += deltaX * 0.45;
          // Clamp velocity to avoid disorienting speed
          wheelVelocityX = Math.max(Math.min(wheelVelocityX, 60), -60);

          if (!isWheeling) {
            isWheeling = true;
            wheelRafIdRef.current = requestAnimationFrame(runWheelMomentum);
          }
        }
      } else if (direction === 'both' || direction === 'y') {
        if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
          stopMomentum();
          wheelVelocityX += deltaX * 0.45;
          wheelVelocityY += deltaY * 0.45;

          if (!isWheeling) {
            isWheeling = true;
            wheelRafIdRef.current = requestAnimationFrame(runWheelMomentum);
          }
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (wheelRafIdRef.current) {
        cancelAnimationFrame(wheelRafIdRef.current);
      }
    };
  }, [direction, smoothWheel, stopMomentum]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      stopMomentum();
      stopWheelMomentum();
    };
  }, [stopMomentum, stopWheelMomentum]);

  return {
    containerRef,
    isPanning,
    bindDrag: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
    stopMomentum,
  };
}
