"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HOME_PACKAGE_LABELS } from "./homeProductSection.copy";

export function useHomeProductFilters(isLoading: boolean) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>(
    HOME_PACKAGE_LABELS.all
  );
  const deferredSelectedCategories = useDeferredValue(selectedCategories);
  const deferredSelectedPackage = useDeferredValue(selectedPackage);
  const filterInteractionStartedRef = useRef<number | null>(null);

  const isFilterUpdating = useMemo(() => {
    if (isLoading) return true;
    if (deferredSelectedPackage !== selectedPackage) return true;
    if (deferredSelectedCategories.length !== selectedCategories.length) {
      return true;
    }
    return deferredSelectedCategories.some(
      (categoryId, index) => categoryId !== selectedCategories[index]
    );
  }, [
    deferredSelectedCategories,
    deferredSelectedPackage,
    isLoading,
    selectedCategories,
    selectedPackage,
  ]);

  const markFilterInteraction = useCallback(() => {
    filterInteractionStartedRef.current = performance.now();
  }, []);

  const handleCategoryToggle = useCallback((categoryId: number) => {
    markFilterInteraction();
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id: number) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, [markFilterInteraction]);

  const handleCategoryReset = useCallback(() => {
    markFilterInteraction();
    setSelectedCategories([]);
  }, [markFilterInteraction]);

  const handlePackageSelect = useCallback((pkg: string) => {
    markFilterInteraction();
    setSelectedPackage(pkg);
  }, [markFilterInteraction]);

  const handleApplyRecommendedCategories = useCallback(
    (categoryIds: number[]) => {
      markFilterInteraction();
      setSelectedPackage(HOME_PACKAGE_LABELS.all);
      setSelectedCategories(categoryIds);
    },
    [markFilterInteraction]
  );

  const handleApplyRecommendedTrial = useCallback(
    (categoryIds: number[]) => {
      markFilterInteraction();
      setSelectedCategories(categoryIds);
      setSelectedPackage(HOME_PACKAGE_LABELS.days7);
    },
    [markFilterInteraction]
  );

  const handleApplyRecommendedMonth = useCallback(
    (categoryIds: number[]) => {
      markFilterInteraction();
      setSelectedCategories(categoryIds);
      setSelectedPackage(HOME_PACKAGE_LABELS.days30);
    },
    [markFilterInteraction]
  );

  useEffect(() => {
    if (isFilterUpdating) return;
    if (filterInteractionStartedRef.current === null) return;
    const elapsedMs = performance.now() - filterInteractionStartedRef.current;
    console.info(`[perf] home:filter-visible ${elapsedMs.toFixed(1)}ms`);
    filterInteractionStartedRef.current = null;
  }, [isFilterUpdating]);

  return {
    selectedSymptoms,
    setSelectedSymptoms,
    selectedCategories,
    setSelectedCategories,
    selectedPackage,
    setSelectedPackage,
    deferredSelectedCategories,
    deferredSelectedPackage,
    isFilterUpdating,
    handleCategoryToggle,
    handleCategoryReset,
    handlePackageSelect,
    handleApplyRecommendedCategories,
    handleApplyRecommendedTrial,
    handleApplyRecommendedMonth,
  };
}
