"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TestimonialItem } from "./testimonials.types";

export function useTestimonialsCarousel(items: readonly TestimonialItem[]) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pauseRef = useRef(false);
  const dragRef = useRef(false);
  const startXRef = useRef(0);
  const startPosRef = useRef(0);
  const posRef = useRef(0);
  const halfRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const idleRef = useRef<number | null>(null);
  const progressCommitTsRef = useRef(0);
  const [progress, setProgress] = useState(0);

  const itemsLocal = useMemo(() => [...items, ...items], [items]);

  const measureHalf = () => {
    const element = trackRef.current;
    if (!element) return false;
    const half = element.scrollWidth / 2;
    if (!Number.isFinite(half) || half <= 1) return false;
    halfRef.current = half;
    return true;
  };

  const applyTransform = () => {
    const element = trackRef.current;
    if (!element) return;
    element.style.transform = `translate3d(${posRef.current}px,0,0)`;
  };

  const normalize = () => {
    const half = halfRef.current || 1;
    while (posRef.current <= -half) posRef.current += half;
    while (posRef.current >= 0) posRef.current -= half;
  };

  const updateProgress = (force = false) => {
    const half = halfRef.current || 1;
    const progressValue = ((-posRef.current % half) + half) % half;
    const now = performance.now();
    if (!force && now - progressCommitTsRef.current < 80) return;
    progressCommitTsRef.current = now;
    const next = progressValue / half;
    setProgress((previous) => (Math.abs(previous - next) < 0.001 ? previous : next));
  };

  useLayoutEffect(() => {
    const element = trackRef.current;
    if (!element) return;

    let retryRaf: number | null = null;
    let destroyed = false;

    const sync = () => {
      const measured = measureHalf();
      normalize();
      applyTransform();
      updateProgress(true);
      return measured;
    };

    const retryMeasure = (attempt = 0) => {
      if (destroyed || attempt >= 24) return;
      if (sync()) return;
      retryRaf = requestAnimationFrame(() => retryMeasure(attempt + 1));
    };

    const onResize = () => {
      sync();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) sync();
    };

    const onLoad = () => {
      sync();
    };

    sync();
    if (halfRef.current <= 1) retryMeasure();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        sync();
      });
      resizeObserver.observe(element);
    } else {
      window.addEventListener("resize", onResize);
    }

    if ("fonts" in document) {
      (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.then(
        () => {
          if (!destroyed) sync();
        }
      );
    }

    window.addEventListener("load", onLoad);
    window.addEventListener("pageshow", onLoad);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    applyTransform();

    return () => {
      destroyed = true;
      if (retryRaf) cancelAnimationFrame(retryRaf);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("pageshow", onLoad);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let last = performance.now();
    const speed = 0.45;

    const step = (time: number) => {
      const deltaTime = Math.min(32, time - last);
      last = time;
      if (halfRef.current <= 1) {
        measureHalf();
      }
      if (!pauseRef.current && halfRef.current > 0) {
        posRef.current -= speed * (deltaTime / 16);
        normalize();
        applyTransform();
        updateProgress();
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const element = trackRef.current;
    if (!element) return;

    const resumeSoon = () => {
      pauseRef.current = true;
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = window.setTimeout(() => {
        pauseRef.current = false;
      }, 800);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pauseRef.current = true;
      dragRef.current = true;
      startXRef.current = event.clientX;
      startPosRef.current = posRef.current;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {}
      element.style.cursor = "grabbing";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      event.preventDefault();
      posRef.current = startPosRef.current + (event.clientX - startXRef.current);
      normalize();
      applyTransform();
      updateProgress();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = false;
      try {
        if (element.hasPointerCapture?.(event.pointerId)) {
          element.releasePointerCapture(event.pointerId);
        }
      } catch {}
      element.style.cursor = "";
      resumeSoon();
    };

    const onWheel = (event: WheelEvent) => {
      pauseRef.current = true;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      posRef.current -= delta;
      normalize();
      applyTransform();
      updateProgress();
      resumeSoon();
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    element.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("wheel", onWheel);
      if (idleRef.current) {
        clearTimeout(idleRef.current);
        idleRef.current = null;
      }
    };
  }, []);

  return { trackRef, progress, itemsLocal };
}
