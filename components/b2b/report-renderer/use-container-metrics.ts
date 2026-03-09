"use client";

import { useEffect, useState, type RefObject } from "react";

const MM_TO_PX = 3.7795275591;

export function useContainerMetrics(ref: RefObject<HTMLDivElement>) {
  const [metrics, setMetrics] = useState({
    width: 0,
    mmToPx: MM_TO_PX,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.left = "-1000mm";
    probe.style.top = "-1000mm";
    probe.style.width = "100mm";
    probe.style.height = "1px";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.padding = "0";
    probe.style.border = "0";
    document.body.appendChild(probe);

    const update = () => {
      const style = window.getComputedStyle(element);
      const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(style.paddingRight) || 0;
      const contentWidth = Math.max(0, element.clientWidth - paddingLeft - paddingRight);
      const measuredMmToPx = probe.getBoundingClientRect().width / 100;
      const nextMmToPx =
        Number.isFinite(measuredMmToPx) && measuredMmToPx > 0 ? measuredMmToPx : MM_TO_PX;

      setMetrics((prev) => {
        if (
          Math.abs(prev.width - contentWidth) < 0.1 &&
          Math.abs(prev.mmToPx - nextMmToPx) < 0.01
        ) {
          return prev;
        }

        return {
          width: contentWidth,
          mmToPx: nextMmToPx,
        };
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      observer.disconnect();
      probe.remove();
    };
  }, [ref]);

  return metrics;
}
