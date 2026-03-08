"use client";

import Image from "next/image";
import { ArrowPathIcon, PhotoIcon } from "@heroicons/react/24/outline";
import {
  ManagerField,
  ManagerInput,
  ManagerMetaRow,
  ManagerSection,
  ManagerSelect,
} from "./managerWorkspace";
import {
  PHARMACY_OPTION_TYPE_OPTIONS,
  type PharmacyProductDraft,
  type PharmacySummary,
  type ProductSummary,
} from "./pharmacyProductManager.types";

export function PharmacyProductCardImage(props: { image?: string | null; alt: string }) {
  if (!props.image) {
    return (
      <div className="flex h-40 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.85),rgba(248,250,252,0.95))] text-slate-400">
        <PhotoIcon className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="relative h-40 overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <Image src={props.image} alt={props.alt} fill sizes="360px" className="object-contain p-5" />
    </div>
  );
}

export function PharmacyProductInventorySection({
  pharmacyId,
  pharmacies,
  draft,
  selectedPharmacyName,
  selectedProductName,
  onPharmacyChange,
  onOptionTypeChange,
  onCapacityChange,
  onPriceChange,
  onStockChange,
}: {
  pharmacyId?: number;
  pharmacies: PharmacySummary[];
  draft: PharmacyProductDraft;
  selectedPharmacyName: string;
  selectedProductName: string;
  onPharmacyChange: (value: string) => void;
  onOptionTypeChange: (value: string) => void;
  onCapacityChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onStockChange: (value: string) => void;
}) {
  return (
    <ManagerSection
      title="운영 설정"
      description="판매 옵션과 재고, 가격 정보를 직접 관리합니다."
    >
      <div className="space-y-4">
        {!pharmacyId ? (
          <ManagerField label="약국 선택">
            <ManagerSelect
              value={draft.pharmacyId || ""}
              onChange={(event) => onPharmacyChange(event.target.value)}
            >
              <option value="">약국을 선택하세요</option>
              {pharmacies.map((pharmacy) => (
                <option key={pharmacy.id} value={pharmacy.id}>
                  {pharmacy.name}
                </option>
              ))}
            </ManagerSelect>
          </ManagerField>
        ) : null}

        <ManagerField label="옵션 타입">
          <ManagerSelect
            value={draft.optionType}
            onChange={(event) => onOptionTypeChange(event.target.value)}
          >
            {PHARMACY_OPTION_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ManagerSelect>
        </ManagerField>

        <ManagerField label="용량 / 구성">
          <ManagerInput
            value={draft.capacity}
            onChange={(event) => onCapacityChange(event.target.value)}
            placeholder="예: 30포, 2g x 14포"
          />
        </ManagerField>

        <div className="grid gap-4 sm:grid-cols-2">
          <ManagerField label="판매가">
            <ManagerInput
              type="number"
              inputMode="numeric"
              value={draft.price}
              onChange={(event) => onPriceChange(event.target.value)}
              placeholder="가격"
            />
          </ManagerField>
          <ManagerField label="재고">
            <ManagerInput
              type="number"
              inputMode="numeric"
              value={draft.stock}
              onChange={(event) => onStockChange(event.target.value)}
              placeholder="재고"
            />
          </ManagerField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ManagerMetaRow label="선택 약국" value={selectedPharmacyName} />
          <ManagerMetaRow label="선택 상품" value={selectedProductName} />
        </div>
      </div>
    </ManagerSection>
  );
}

export function PharmacyProductSelectionSection({
  productSearchValue,
  isRefreshingProducts,
  selectableProducts,
  selectedProductName,
  selectedPharmacyName,
  selectedProductId,
  onProductSearchChange,
  onRefreshProducts,
  onProductChange,
}: {
  productSearchValue: string;
  isRefreshingProducts: boolean;
  selectableProducts: ProductSummary[];
  selectedProductName: string;
  selectedPharmacyName: string;
  selectedProductId: number | null;
  onProductSearchChange: (value: string) => void;
  onRefreshProducts: () => void;
  onProductChange: (value: string) => void;
}) {
  return (
    <ManagerSection
      title="상품 선택"
      description="상단 검색으로 후보를 빠르게 좁힌 뒤 드롭다운에서 바로 선택합니다."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ManagerInput
            value={productSearchValue}
            onChange={(event) => onProductSearchChange(event.target.value)}
            placeholder="상품명 검색"
          />
          <button
            type="button"
            onClick={onRefreshProducts}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            aria-label="상품 목록 새로고침"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshingProducts ? "animate-spin" : ""}`} />
          </button>
        </div>

        <ManagerSelect
          value={selectedProductId || ""}
          onChange={(event) => onProductChange(event.target.value)}
        >
          <option value="">상품을 선택하세요</option>
          {selectableProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </ManagerSelect>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-900">선택 상태 요약</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ManagerMetaRow label="상품" value={selectedProductName} />
            <ManagerMetaRow label="약국" value={selectedPharmacyName} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            상품 검색값은 드롭다운 위에 고정되어 있어, 긴 상품 목록에서도 원하는 항목을 빠르게 찾을 수
            있습니다.
          </p>
        </div>
      </div>
    </ManagerSection>
  );
}
