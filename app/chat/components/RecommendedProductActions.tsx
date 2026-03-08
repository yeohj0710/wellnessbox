"use client";

import AddressModal from "@/components/modal/addressModal";
import RecommendedProductActionList from "./RecommendedProductActionList";
import RecommendedProductAddressGuideModal from "./RecommendedProductAddressGuideModal";
import RecommendedProductConfirmDialog from "./RecommendedProductConfirmDialog";
import { useRecommendedProductActionsController } from "./useRecommendedProductActionsController";

type RecommendedProductActionsProps = {
  content: string;
};

export default function RecommendedProductActions({
  content,
}: RecommendedProductActionsProps) {
  const {
    parsed,
    items,
    loading,
    expanded,
    feedback,
    shouldRender,
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
  } = useRecommendedProductActionsController({ content });

  if (!shouldRender) return null;

  return (
    <div className="mt-3 ms-2 w-full max-w-[86%] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:max-w-[74%] md:max-w-[70%]">
      <RecommendedProductActionList
        parsed={parsed}
        items={items}
        loading={loading}
        expanded={expanded}
        feedback={feedback}
        onToggleExpanded={toggleExpanded}
        onAddAll={addAll}
        onBuyAll={() => buyNow(items)}
        onAddSingle={addSingle}
        onBuySingle={(item) => buyNow([item])}
      />

      <RecommendedProductAddressGuideModal
        open={showAddressGuideModal}
        panelRef={guideModalDrag.panelRef}
        panelStyle={guideModalDrag.panelStyle}
        isDragging={guideModalDrag.isDragging}
        onDragPointerDown={guideModalDrag.handleDragPointerDown}
        onClose={closeAddressGuideModal}
        onOpenAddressModal={openAddressModalFromGuide}
      />

      {confirmDialog && (
        <RecommendedProductConfirmDialog
          dialog={confirmDialog}
          panelRef={confirmModalDrag.panelRef}
          panelStyle={confirmModalDrag.panelStyle}
          isDragging={confirmModalDrag.isDragging}
          onDragPointerDown={confirmModalDrag.handleDragPointerDown}
          onCancel={closeConfirmDialog}
          onConfirm={confirmCartAction}
        />
      )}

      {isAddressModalOpen && (
        <AddressModal onClose={closeAddressModal} onSave={handleAddressSave} />
      )}
    </div>
  );
}
