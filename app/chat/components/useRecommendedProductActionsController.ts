"use client";

import { useEffect, useMemo, useState } from "react";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import {
  applyPendingCartActionAfterAddressSave,
  type ActionableRecommendation,
  type PendingCartAction,
  normalizeKey,
  parseRecommendationLines,
  resolveRecommendations,
  runCartActionWithAddressGuard,
} from "./recommendedProductActions.utils";

export type RecommendedProductActionConfirmDialog = {
  title: string;
  description: string;
  confirmLabel: string;
  targets: ActionableRecommendation[];
  openCartAfterSave?: boolean;
  successFeedback?: string;
};

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
    const timer = window.setTimeout(() => setFeedback(""), 1800);
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
    setConfirmDialog({
      title: "장바구니에 담을까요?",
      description: `'${item.productName}'을 장바구니에 추가합니다.`,
      confirmLabel: "담기",
      targets: [item],
      successFeedback: `장바구니에 담았어요: ${item.productName}`,
    });
  }

  function addAll() {
    if (!items.length) return;
    setConfirmDialog({
      title: `추천 상품 ${items.length}개 담기`,
      description: "추천된 상품을 장바구니에 한 번에 추가합니다.",
      confirmLabel: "전체 담기",
      targets: items,
      successFeedback: `추천 상품 ${items.length}개를 장바구니에 담았어요.`,
    });
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
    localStorage.setItem("roadAddress", roadAddress);
    localStorage.setItem("detailAddress", detailAddress);
    window.dispatchEvent(new Event("addressUpdated"));

    const pending = pendingCartAction;
    setPendingCartAction(null);
    setIsAddressModalOpen(false);

    if (!pending || pending.items.length === 0) return;

    const openedCart = applyPendingCartActionAfterAddressSave({
      pending,
    });
    if (openedCart) return;
    if (pending.successFeedback) {
      setFeedback(pending.successFeedback);
      return;
    }
    if (pending.items.length === 1) {
      setFeedback(`장바구니에 담았어요: ${pending.items[0].productName}`);
      return;
    }
    setFeedback(`추천 상품 ${pending.items.length}개를 장바구니에 담았어요.`);
  }

  return {
    parsed,
    items,
    loading,
    expanded,
    feedback,
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
