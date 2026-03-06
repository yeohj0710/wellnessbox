import { useCallback, useRef } from "react";

const FIXED_TOP_INSET_PX = 80;
const FIXED_BOTTOM_INSET_PX = 16;

export function useSurveyEditorQuestionScroller() {
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToQuestion = useCallback((questionKey: string) => {
    window.requestAnimationFrame(() => {
      const node = questionRefs.current[questionKey];
      if (!node) return;

      const viewportHeight = Math.max(
        1,
        window.innerHeight - FIXED_TOP_INSET_PX - FIXED_BOTTOM_INSET_PX
      );
      const nodeRect = node.getBoundingClientRect();
      const nodeHeight = Math.max(1, nodeRect.height);
      const centerOffset = Math.max(0, (viewportHeight - nodeHeight) / 2);
      const targetTop =
        window.scrollY + nodeRect.top - FIXED_TOP_INSET_PX - centerOffset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });

      const focusable = node.querySelector<HTMLElement>(
        "input,button,select,textarea"
      );
      focusable?.focus({ preventScroll: true });
    });
  }, []);

  const setQuestionRef = useCallback(
    (questionKey: string, node: HTMLDivElement | null) => {
      questionRefs.current[questionKey] = node;
    },
    []
  );

  return {
    scrollToQuestion,
    setQuestionRef,
  };
}
