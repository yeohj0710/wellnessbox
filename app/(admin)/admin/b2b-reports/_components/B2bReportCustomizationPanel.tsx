/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import styles from "@/components/b2b/B2bUx.module.css";
import { getUploadUrl } from "@/lib/upload";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";
import { createEmptyReportPackagedProduct } from "@/lib/b2b/report-customization-types";

type B2bReportCustomizationPanelProps = {
  consultationSummary: string;
  packagedProducts: B2bReportPackagedProduct[];
  busy: boolean;
  onConsultationSummaryChange: (value: string) => void;
  onPackagedProductsChange: (products: B2bReportPackagedProduct[]) => void;
  onSave: () => void;
};

type ProductFieldKey =
  | "name"
  | "brand"
  | "imageUrl"
  | "description"
  | "ingredientSummary"
  | "caution";

async function uploadProductImage(file: File) {
  const { success, result } = await getUploadUrl();
  if (!success) {
    throw new Error("이미지 업로드 주소를 준비하지 못했습니다.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(result.uploadURL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("이미지를 업로드하지 못했습니다.");
  }

  const data = await response.json();
  const fileUrl = data.result?.variants?.find((url: string) => url.endsWith("/public"));
  if (!fileUrl) {
    throw new Error("업로드한 이미지 주소를 확인하지 못했습니다.");
  }

  return fileUrl as string;
}

export default function B2bReportCustomizationPanel({
  consultationSummary,
  packagedProducts,
  busy,
  onConsultationSummaryChange,
  onPackagedProductsChange,
  onSave,
}: B2bReportCustomizationPanelProps) {
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);

  const hasContent = useMemo(
    () =>
      consultationSummary.trim().length > 0 ||
      packagedProducts.some(
        (product) =>
          product.name.trim().length > 0 ||
          (product.brand || "").trim().length > 0 ||
          (product.imageUrl || "").trim().length > 0 ||
          (product.description || "").trim().length > 0 ||
          (product.ingredientSummary || "").trim().length > 0 ||
          (product.caution || "").trim().length > 0
      ),
    [consultationSummary, packagedProducts]
  );

  function updateProducts(
    updater: (current: B2bReportPackagedProduct[]) => B2bReportPackagedProduct[]
  ) {
    onPackagedProductsChange(updater(packagedProducts));
  }

  function handleFieldChange(productId: string, field: ProductFieldKey, value: string) {
    updateProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? {
              ...product,
              [field]: field === "name" ? value : value.length > 0 ? value : null,
            }
          : product
      )
    );
  }

  async function handleImageFileChange(productId: string, file: File | null) {
    if (!file) return;
    setUploadingProductId(productId);

    try {
      const imageUrl = await uploadProductImage(file);
      updateProducts((current) =>
        current.map((product) =>
          product.id === productId
            ? {
                ...product,
                imageUrl,
              }
            : product
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadingProductId(null);
    }
  }

  return (
    <details className={`${styles.optionalCard} ${styles.editorPanel}`}>
      <summary className={styles.editorPanelSummary}>
        <span className={styles.editorPanelSummaryTitle}>약사 코멘트 편집</span>
        <span className={styles.editorPanelSummaryMeta}>상담 요약 · 패키지 제품 정보</span>
      </summary>

      <div className={styles.editorPanelMotion}>
        <div className={styles.editorPanelBody}>
          <div className={styles.editorGuide}>
            <p className={styles.editorGuideTitle}>입력 가이드</p>
            <ul className={styles.editorGuideList}>
              <li>상담 요약은 레포트 마지막 페이지에 들어갈 문장형 메모로 적어 주세요.</li>
              <li>패키지 제품은 이번 달 실제 제공 기준으로 보일 정보만 채워 주세요.</li>
              <li>비어 있는 항목은 레포트에서 자동으로 숨겨집니다.</li>
            </ul>
          </div>

          <section className={styles.editorFieldGroup}>
            <p className={styles.editorFieldLabel}>약사 코멘트</p>
            <p className={styles.editorFieldHint}>
              레포트 마지막 페이지에서 먼저 보이는 맞춤형 코멘트입니다.
            </p>
            <textarea
              className={styles.textarea}
              value={consultationSummary}
              disabled={busy}
              rows={4}
              onChange={(event) => onConsultationSummaryChange(event.target.value)}
              placeholder="수면, 피로, 식사 리듬처럼 지금 우선순위가 높은 포인트를 짧고 분명하게 정리해 주세요."
            />
          </section>

          <section className={styles.editorSection}>
            <div className={styles.editorSectionHead}>
              <div>
                <h4 className={styles.editorSectionTitle}>패키지 제품 정보</h4>
                <p className={styles.editorSectionHint}>
                  상품명, 이미지, 주요 성분, 참고 메모를 마지막 페이지에 반영합니다.
                </p>
              </div>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={busy}
                onClick={() =>
                  updateProducts((current) => [...current, createEmptyReportPackagedProduct()])
                }
              >
                제품 추가
              </button>
            </div>

            {packagedProducts.length === 0 ? (
              <div className={styles.editorFieldGroup}>
                <p className={styles.editorFieldHint}>
                  아직 추가된 제품이 없습니다. 필요한 경우에만 입력해 주세요.
                </p>
              </div>
            ) : (
              <div className={styles.reportProductEditorList}>
                {packagedProducts.map((product, index) => {
                  const isUploading = uploadingProductId === product.id;

                  return (
                    <section key={product.id} className={styles.reportProductEditorCard}>
                      <div className={styles.reportProductEditorHead}>
                        <div>
                          <p className={styles.editorFieldLabel}>제품 {index + 1}</p>
                          <p className={styles.editorFieldHint}>
                            비어 있는 항목은 레포트에서 자동으로 숨겨집니다.
                          </p>
                        </div>
                        <button
                          type="button"
                          className={styles.buttonGhost}
                          disabled={busy || isUploading}
                          onClick={() =>
                            updateProducts((current) =>
                              current.filter((item) => item.id !== product.id)
                            )
                          }
                        >
                          삭제
                        </button>
                      </div>

                      <div className={styles.editorTwoCol}>
                        <div className={styles.editorFieldGroup}>
                          <p className={styles.editorFieldLabel}>상품명</p>
                          <input
                            className={styles.input}
                            value={product.name}
                            disabled={busy}
                            onChange={(event) =>
                              handleFieldChange(product.id, "name", event.target.value)
                            }
                            placeholder="예: 프리미엄 오메가3"
                          />
                        </div>
                        <div className={styles.editorFieldGroup}>
                          <p className={styles.editorFieldLabel}>브랜드 / 제조사</p>
                          <input
                            className={styles.input}
                            value={product.brand ?? ""}
                            disabled={busy}
                            onChange={(event) =>
                              handleFieldChange(product.id, "brand", event.target.value)
                            }
                            placeholder="예: 일동제약"
                          />
                        </div>
                      </div>

                      <div className={styles.editorTwoCol}>
                        <div className={styles.editorFieldGroup}>
                          <p className={styles.editorFieldLabel}>이미지 URL</p>
                          <input
                            className={styles.input}
                            value={product.imageUrl ?? ""}
                            disabled={busy || isUploading}
                            onChange={(event) =>
                              handleFieldChange(product.id, "imageUrl", event.target.value)
                            }
                            placeholder="https://..."
                          />
                        </div>
                        <div className={styles.editorFieldGroup}>
                          <p className={styles.editorFieldLabel}>이미지 업로드</p>
                          <div className={styles.reportProductEditorUploadRow}>
                            <label className={styles.buttonGhost}>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={busy || isUploading}
                                className={styles.reportProductEditorFileInput}
                                onChange={(event) =>
                                  void handleImageFileChange(
                                    product.id,
                                    event.target.files?.[0] ?? null
                                  )
                                }
                              />
                              {isUploading ? (
                                <InlineSpinnerLabel label="업로드 중" />
                              ) : (
                                "파일 올리기"
                              )}
                            </label>
                            {product.imageUrl ? (
                              <button
                                type="button"
                                className={styles.buttonSecondary}
                                disabled={busy || isUploading}
                                onClick={() => handleFieldChange(product.id, "imageUrl", "")}
                              >
                                이미지 제거
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {product.imageUrl ? (
                        <div className={styles.reportProductEditorPreview}>
                          <img
                            src={product.imageUrl}
                            alt={`${product.name || "제품"} 미리보기`}
                            className={styles.reportProductEditorPreviewImage}
                          />
                        </div>
                      ) : null}

                      <div className={styles.editorFieldGroup}>
                        <p className={styles.editorFieldLabel}>상품 소개</p>
                        <textarea
                          className={styles.textarea}
                          value={product.description ?? ""}
                          disabled={busy}
                          rows={3}
                          onChange={(event) =>
                            handleFieldChange(product.id, "description", event.target.value)
                          }
                          placeholder="이번 달 컨디션 관리에 왜 포함됐는지 짧게 설명해 주세요."
                        />
                      </div>

                      <div className={styles.editorFieldGroup}>
                        <p className={styles.editorFieldLabel}>주요 성분</p>
                        <textarea
                          className={styles.textarea}
                          value={product.ingredientSummary ?? ""}
                          disabled={busy}
                          rows={3}
                          onChange={(event) =>
                            handleFieldChange(
                              product.id,
                              "ingredientSummary",
                              event.target.value
                            )
                          }
                          placeholder="예: EPA 및 DHA 함유 유지, 비타민E"
                        />
                      </div>

                      <div className={styles.editorFieldGroup}>
                        <p className={styles.editorFieldLabel}>추가 확인 메모</p>
                        <textarea
                          className={styles.textarea}
                          value={product.caution ?? ""}
                          disabled={busy}
                          rows={3}
                          onChange={(event) =>
                            handleFieldChange(product.id, "caution", event.target.value)
                          }
                          placeholder="예: 기존 약 복용 여부나 개인차가 있으면 같이 확인해 주세요."
                        />
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </section>

          <div className={styles.editorActionBar}>
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className={`${styles.buttonPrimary} ${styles.editorPrimaryButton}`}
            >
              {busy ? (
                <InlineSpinnerLabel label="약사 코멘트 저장 중" />
              ) : (
                "약사 코멘트 저장"
              )}
            </button>
          </div>

          {!hasContent ? (
            <p className={styles.editorFieldHint}>
              아직 입력된 내용이 없어 마지막 추가 페이지는 생성되지 않습니다.
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
