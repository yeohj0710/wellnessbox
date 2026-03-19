"use client";

import { useEffect, useMemo, useState } from "react";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import {
  buildBulkRecommendationConfirmDialog,
  buildSingleRecommendationConfirmDialog,
  persistRecommendedProductAddress,
  resolvePendingCartActionFeedback,
  type RecommendedProductActionConfirmDialog,
} from "./recommendedProductActions.controller-support";
import {
  applyPendingCartActionAfterAddressSave,
  type ActionableRecommendation,
  type PendingCartAction,
  normalizeKey,
  parseRecommendationLines,
  resolveRecommendations,
  runCartActionWithAddressGuard,
} from "./recommendedProductActions.utils";

export const RECOMMENDED_ACTION_FEEDBACK_AUTO_HIDE_MS = 1800;

type UseRecommendedProductActionsControllerOptions = {
  content: string;
};

export function useRecommendedProductActionsController({
  content,
}: UseRecommendedProductActionsControllerOptions) {
  const parsed = useMemo(() => parseRecommendationLines(content || ""), [content]);
  const parsedKey = useMemo(
    () =>
      parsed
        .map((row) => `${normalizeKey(row.category)}:${normalizeKey(row.productName)}`)
        .join("|"),
    [parsed]
  );
  const [items, setItems] = useState<ActionableRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [showAddressGuideModal, setShowAddressGuideModal] = useState(false);
  const [pendingCartAction, setPendingCartAction] =
    useState<PendingCartAction | null>(null);
  const [confirmDialog, setConfirmDialog] =
    useState<RecommendedProductActionConfirmDialog | null>(null);
  const guideModalDrag = useDraggableModal(showAddressGuideModal, {
    resetOnOpen: true,
  });
  const confirmModalDrag = useDraggableModal(Boolean(confirmDialog), {
    resetOnOpen: true,
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(
      () => setFeedback(""),
      RECOMMENDED_ACTION_FEEDBACK_AUTO_HIDE_MS
    );
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    setExpanded(false);
  }, [parsedKey]);

  useEffect(() => {
    let alive = true;

    if (!parsed.length) {
      setItems([]);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    setLoading(true);
    resolveRecommendations(parsed)
      .then((resolved) => {
        if (!alive) return;
        setItems(resolved);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [parsed]);

  function runCartAction(
    targets: ActionableRecommendation[],
    options?: {
      openCartAfterSave?: boolean;
      successFeedback?: string;
    }
  ) {
    runCartActionWithAddressGuard({
      targets,
      options,
      setPendingCartAction,
      setShowAddressGuideModal,
      setFeedback,
    });
  }

  function addSingle(item: ActionableRecommendation) {
    setConfirmDialog(buildSingleRecommendationConfirmDialog(item));
  }

  function addAll() {
    if (!items.length) return;
    setConfirmDialog(buildBulkRecommendationConfirmDialog(items));
  }

  function buyNow(targets: ActionableRecommendation[]) {
    if (!targets.length) return;
    runCartAction(targets, { openCartAfterSave: true });
  }

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

  function closeAddressGuideModal() {
    setShowAddressGuideModal(false);
    setPendingCartAction(null);
  }

  function openAddressModalFromGuide() {
    setShowAddressGuideModal(false);
    setIsAddressModalOpen(true);
  }

  function closeConfirmDialog() {
    setConfirmDialog(null);
  }

  function confirmCartAction() {
    const next = confirmDialog;
    if (!next) return;
    setConfirmDialog(null);
    runCartAction(next.targets, {
      openCartAfterSave: next.openCartAfterSave,
      successFeedback: next.successFeedback,
    });
  }

  function closeAddressModal() {
    setIsAddressModalOpen(false);
    setPendingCartAction(null);
  }

  function handleAddressSave(roadAddress: string, detailAddress: string) {
    persistRecommendedProductAddress(roadAddress, detailAddress);

    const pending = pendingCartAction;
    setPendingCartAction(null);
    setIsAddressModalOpen(false);

    if (!pending || pending.items.length === 0) return;

    const openedCart = applyPendingCartActionAfterAddressSave({
      pending,
    });
    if (openedCart) return;

    setFeedback(resolvePendingCartActionFeedback(pending));
  }

  return {
    parsed,
    items,
    loading,
    expanded,
    feedback,
    feedbackDurationMs: RECOMMENDED_ACTION_FEEDBACK_AUTO_HIDE_MS,
    shouldRender: parsed.length > 0 && (loading || items.length > 0),
    isAddressModalOpen,
    showAddressGuideModal,
    confirmDialog,
    guideModalDrag,
    confirmModalDrag,
    toggleExpanded,
    addSingle,
    addAll,
    buyNow,
    closeAddressGuideModal,
    openAddressModalFromGuide,
    closeConfirmDialog,
    confirmCartAction,
    closeAddressModal,
    handleAddressSave,
  };
}
