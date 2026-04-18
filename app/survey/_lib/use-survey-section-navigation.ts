import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  isSurveyQuestionAnswered,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import {
  getFocusedIndex,
  type SurveySectionGroup,
} from "@/app/survey/_lib/survey-page-helpers";

type QuestionAlign = "comfort" | "center";

type UseSurveySectionNavigationInput = {
  surveySections: SurveySectionGroup[];
  answers: PublicSurveyAnswers;
  currentSectionIndex: number;
  focusedQuestionBySection: Record<string, string>;
  isSectionTransitioning: boolean;
  scrollContainerRef?: MutableRefObject<HTMLElement | null>;
  setCurrentSectionIndex: Dispatch<SetStateAction<number>>;
  setFocusedQuestionBySection: Dispatch<SetStateAction<Record<string, string>>>;
  setErrorText: Dispatch<SetStateAction<string | null>>;
  setErrorQuestionKey: Dispatch<SetStateAction<string | null>>;
};

export function useSurveySectionNavigation(input: UseSurveySectionNavigationInput) {
  const {
    surveySections,
    answers,
    currentSectionIndex,
    focusedQuestionBySection,
    isSectionTransitioning,
    scrollContainerRef,
    setCurrentSectionIndex,
    setFocusedQuestionBySection,
    setErrorText,
    setErrorQuestionKey,
  } = input;

  const questionRefs = useRef<Record<string, HTMLElement | null>>({});

  const currentSection = useMemo(
    () => surveySections[currentSectionIndex] ?? null,
    [currentSectionIndex, surveySections]
  );
  const focusedIndex = getFocusedIndex(
    currentSection,
    focusedQuestionBySection[currentSection?.key ?? ""],
    answers
  );
  const focusedQuestionKey =
    currentSection && focusedIndex >= 0
      ? currentSection.questions[focusedIndex].question.key
      : null;

  useEffect(() => {
    setCurrentSectionIndex((prev) => {
      if (surveySections.length === 0) return 0;
      return Math.max(0, Math.min(prev, surveySections.length - 1));
    });
  }, [setCurrentSectionIndex, surveySections.length]);

  useEffect(() => {
    if (!currentSection || currentSection.questions.length === 0) return;
    const existing = focusedQuestionBySection[currentSection.key];
    if (existing && currentSection.questions.some((q) => q.question.key === existing)) return;
    setFocusedQuestionBySection((prev) => ({
      ...prev,
      [currentSection.key]: currentSection.questions[0].question.key,
    }));
  }, [currentSection, focusedQuestionBySection, setFocusedQuestionBySection]);

  const setQuestionRef = useCallback((questionKey: string, node: HTMLElement | null) => {
    questionRefs.current[questionKey] = node;
  }, []);

  const scrollToQuestion = useCallback(
    (questionKey: string, options?: { align?: QuestionAlign }) => {
      const align = options?.align ?? "comfort";
      const run = (attempt: number) => {
        window.requestAnimationFrame(() => {
          const node = questionRefs.current[questionKey];
          if (!node) {
            if (attempt < 12) window.setTimeout(() => run(attempt + 1), 40);
            return;
          }

          const scrollContainer = scrollContainerRef?.current;
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const rect = node.getBoundingClientRect();
            const topPadding = 20;
            const bottomPadding = 28;
            const safeTop = 12;
            const safeBottom = 20;
            const safeHeight = Math.max(
              1,
              scrollContainer.clientHeight - safeTop - safeBottom
            );
            const relativeTop = rect.top - containerRect.top;

            if (align === "center") {
              const centeredOffset =
                safeTop + (safeHeight - Math.min(rect.height, safeHeight)) / 2;
              const targetTop = scrollContainer.scrollTop + relativeTop - centeredOffset;
              if (Math.abs(targetTop - scrollContainer.scrollTop) > 6) {
                scrollContainer.scrollTo({
                  top: Math.max(0, targetTop),
                  behavior: "smooth",
                });
              }
            } else {
              const inComfortZone =
                rect.top >= containerRect.top + topPadding &&
                rect.bottom <= containerRect.bottom - bottomPadding;
              if (!inComfortZone) {
                const targetTop = scrollContainer.scrollTop + relativeTop - topPadding;
                scrollContainer.scrollTo({
                  top: Math.max(0, targetTop),
                  behavior: "smooth",
                });
              }
            }

            const focusable = node.querySelector<HTMLElement>(
              "input,button,select,textarea"
            );
            focusable?.focus({ preventScroll: true });
            return;
          }

          const isMobileViewport = window.innerWidth < 640;
          const topPadding = isMobileViewport ? 84 : 116;
          const bottomPadding = isMobileViewport ? 104 : 170;
          const rect = node.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const safeTop = isMobileViewport ? 76 : 108;
          const safeBottom = isMobileViewport ? 92 : 148;
          const safeHeight = Math.max(1, viewportHeight - safeTop - safeBottom);

          if (align === "center") {
            const centeredOffset =
              safeTop + (safeHeight - Math.min(rect.height, safeHeight)) / 2;
            const targetTop = window.scrollY + rect.top - centeredOffset;
            if (Math.abs(targetTop - window.scrollY) > 6) {
              window.scrollTo({
                top: Math.max(0, targetTop),
                behavior: "smooth",
              });
            }
          } else {
            const inComfortZone =
              rect.top >= topPadding && rect.bottom <= viewportHeight - bottomPadding;
            if (inComfortZone) {
              const focusable = node.querySelector<HTMLElement>(
                "input,button,select,textarea"
              );
              focusable?.focus({ preventScroll: true });
              return;
            }
            const targetTop = window.scrollY + rect.top - topPadding;
            window.scrollTo({
              top: Math.max(0, targetTop),
              behavior: "smooth",
            });
          }

          const focusable = node.querySelector<HTMLElement>(
            "input,button,select,textarea"
          );
          focusable?.focus({ preventScroll: true });
        });
      };
      run(0);
    },
    [scrollContainerRef]
  );

  const moveToSection = useCallback(
    (nextIndex: number) => {
      if (isSectionTransitioning) return;
      if (surveySections.length === 0) return;
      const clamped = Math.max(0, Math.min(nextIndex, surveySections.length - 1));
      const target = surveySections[clamped];
      if (!target) return;
      const saved = focusedQuestionBySection[target.key];
      const firstUnanswered = target.questions.findIndex(
        (q) => !isSurveyQuestionAnswered(q.question, answers[q.question.key])
      );
      const fallback =
        target.questions[firstUnanswered >= 0 ? firstUnanswered : 0]?.question.key ?? "";
      const nextKey =
        saved && target.questions.some((q) => q.question.key === saved) ? saved : fallback;
      setCurrentSectionIndex(clamped);
      if (nextKey) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [target.key]: nextKey }));
        scrollToQuestion(nextKey);
      }
      setErrorText(null);
      setErrorQuestionKey(null);
    },
    [
      answers,
      focusedQuestionBySection,
      isSectionTransitioning,
      scrollToQuestion,
      setCurrentSectionIndex,
      setErrorQuestionKey,
      setErrorText,
      setFocusedQuestionBySection,
      surveySections,
    ]
  );

  return {
    currentSection,
    focusedQuestionKey,
    scrollToQuestion,
    moveToSection,
    setQuestionRef,
  };
}
