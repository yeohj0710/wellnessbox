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
  | "intakeSummary"
  | "caution";

async function uploadProductImage(file: File) {
  const { success, result } = await getUploadUrl();
  if (!success) {
    throw new Error("이미지 업로드 URL을 준비하지 못했습니다.");
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
    throw new Error("업로드된 이미지 주소를 확인하지 못했습니다.");
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
          (product.imageUrl || "").trim().length > 0
      ),
    [consultationSummary, packagedProducts]
  );

  function updateProducts(
    updater: (current: B2bReportPackagedProduct[]) => B2bReportPackagedProduct[]
  ) {
    onPackagedProductsChange(updater(packagedProducts));
  }

  function handleFieldChange(
    productId: string,
    field: ProductFieldKey,
    value: string
  ) {
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
        <span className={styles.editorPanelSummaryTitle}>레포트 마지막 추가 정보</span>
        <span className={styles.editorPanelSummaryMeta}>
          있으면만 마지막 페이지에 반영
        </span>
      </summary>
      <div className={styles.editorPanelMotion}>
        <div className={styles.editorPanelBody}>
          <div className={styles.editorGuide}>
            <p className={styles.editorGuideTitle}>추가 방법</p>
            <ul className={styles.editorGuideList}>
              <li>상담 요약은 2~3줄 정도로 짧게 정리해 주세요.</li>
              <li>패키징 제품 정보는 실제 레포트에 보일 내용만 남겨 주세요.</li>
              <li>비워 두면 레포트 마지막에는 이 섹션이 나타나지 않습니다.</li>
            </ul>
          </div>

          <section className={styles.editorFieldGroup}>
            <p className={styles.editorFieldLabel}>약사 상담 요약 일부</p>
            <p className={styles.editorFieldHint}>
              레포트 마지막에 짧게 들어갈 상담 메모입니다.
            </p>
            <textarea
              className={styles.textarea}
              value={consultationSummary}
              disabled={busy}
              rows={4}
              onChange={(event) => onConsultationSummaryChange(event.target.value)}
              placeholder="예: 최근 피로감과 식사 리듬을 먼저 정리하면서, 시작 부담이 적은 구성부터 천천히 맞춰 보는 쪽으로 안내했어요."
            />
          </section>

          <section className={styles.editorSection}>
            <div className={styles.editorSectionHead}>
              <div>
                <h4 className={styles.editorSectionTitle}>패키징 제품 정보</h4>
                <p className={styles.editorSectionHint}>
                  이미지, 제품 설명, 성분, 섭취 포인트를 그대로 레포트에 반영합니다.
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
                  아직 추가한 제품이 없습니다. 필요할 때만 넣어 주세요.
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
                            빈 항목은 레포트에서 자연스럽게 생략됩니다.
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
                          <p className={styles.editorFieldLabel}>제품명</p>
                          <input
                            className={styles.input}
                            value={product.name}
                            disabled={busy}
                            onChange={(event) =>
                              handleFieldChange(product.id, "name", event.target.value)
                            }
                            placeholder="예: 밀크씨슬 7일 패키지"
                          />
                        </div>
                        <div className={styles.editorFieldGroup}>
                          <p className={styles.editorFieldLabel}>브랜드/제조사</p>
                          <input
                            className={styles.input}
                            value={product.brand ?? ""}
                            disabled={busy}
                            onChange={(event) =>
                              handleFieldChange(product.id, "brand", event.target.value)
                            }
                            placeholder="예: NOW"
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
                        <p className={styles.editorFieldLabel}>제품 소개</p>
                        <textarea
                          className={styles.textarea}
                          value={product.description ?? ""}
                          disabled={busy}
                          rows={3}
                          onChange={(event) =>
                            handleFieldChange(product.id, "description", event.target.value)
                          }
                          placeholder="예: 시작 부담을 낮추면서 간 기능 케어를 먼저 챙기기 좋은 구성입니다."
                        />
                      </div>

                      <div className={styles.editorTwoCol}>
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
                            placeholder="예: 실리마린, 비타민B군"
                          />
                        </div>
                        <div className={styles.editorFieldGroup}>
                          <p className={styles.editorFieldLabel}>섭취 안내</p>
                          <textarea
                            className={styles.textarea}
                            value={product.intakeSummary ?? ""}
                            disabled={busy}
                            rows={3}
                            onChange={(event) =>
                              handleFieldChange(product.id, "intakeSummary", event.target.value)
                            }
                            placeholder="예: 식후 하루 1회부터 가볍게 시작해 주세요."
                          />
                        </div>
                      </div>

                      <div className={styles.editorFieldGroup}>
                        <p className={styles.editorFieldLabel}>함께 적을 주의 메모</p>
                        <textarea
                          className={styles.textarea}
                          value={product.caution ?? ""}
                          disabled={busy}
                          rows={2}
                          onChange={(event) =>
                            handleFieldChange(product.id, "caution", event.target.value)
                          }
                          placeholder="예: 복용 중인 약이 있으면 같이 확인해 주세요."
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
              disabled={busy || uploadingProductId !== null}
              className={`${styles.buttonPrimary} ${styles.editorPrimaryButton}`}
            >
              {busy ? (
                <InlineSpinnerLabel label="마지막 정보 저장 중" />
              ) : hasContent ? (
                "마지막 정보 저장"
              ) : (
                "빈 상태로 저장"
              )}
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}
