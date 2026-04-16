/* eslint-disable @next/next/no-img-element */
import styles from "../B2bUx.module.css";
import type { ReportSummaryAddendumPageModel } from "./detail-data-model";

type ReportSummaryAddendumPageProps = {
  pageNumber: number;
  addendum: ReportSummaryAddendumPageModel;
  isContinuation?: boolean;
};

export default function ReportSummaryAddendumPage(
  props: ReportSummaryAddendumPageProps
) {
  const { pageNumber, addendum, isContinuation = false } = props;
  const title = "약사 코멘트";
  const subtitle = addendum.consultationSummary
    ? isContinuation
      ? "이전 페이지에 이어 담당 약사의 코멘트를 계속 확인하세요."
      : "담당 약사의 코멘트를 읽기 편한 흐름으로 정리했습니다."
    : "필요한 안내를 이어서 확인하세요.";
  const commentParagraphs = addendum.consultationSummary
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section
      className={`${styles.reportSheet} ${styles.reportSheetThird}`}
      data-report-page={String(pageNumber)}
    >
      <header className={styles.reportPageHeader}>
        <p className={styles.reportPageKicker}>{`${pageNumber}페이지 추가 안내`}</p>
        <h2 className={styles.reportPageTitle}>{title}</h2>
        <p className={styles.reportPageSubtitle}>{subtitle}</p>
      </header>

      <div className={styles.reportSecondStack}>
        {addendum.consultationSummary ? (
          <article className={styles.reportPharmacistCommentCard}>
            <p className={styles.reportPharmacistCommentEyebrow}>담당 약사 코멘트</p>
            <div className={styles.reportPharmacistCommentBody}>
              {commentParagraphs.map((paragraph, index) => (
                <p
                  key={`pharmacist-comment-${pageNumber}-${index + 1}`}
                  className={styles.reportPharmacistCommentParagraph}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        ) : null}

        {addendum.packagedProducts.length > 0 ? (
          <article className={styles.reportDataCard}>
            <div className={styles.reportDataHeadRow}>
              <h3 className={styles.reportDataTitle}>패키지 구성</h3>
            </div>
            <div className={styles.reportPackagedProductGrid}>
              {addendum.packagedProducts.map((product) => (
                <section key={product.id} className={styles.reportPackagedProductCard}>
                  <div className={styles.reportPackagedProductImageWrap}>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className={styles.reportPackagedProductImage}
                      />
                    ) : (
                      <div className={styles.reportPackagedProductImageFallback} aria-hidden="true">
                        <span className={styles.reportPackagedProductImageFallbackBadge}>
                          {product.name.slice(0, 2)}
                        </span>
                        <span className={styles.reportPackagedProductImageFallbackText}>
                          패키지 제품
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.reportPackagedProductContent}>
                    <div className={styles.reportPackagedProductHead}>
                      <div>
                        <p className={styles.reportPackagedProductName}>{product.name}</p>
                        {product.brand ? (
                          <p className={styles.reportPackagedProductBrand}>{product.brand}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.reportPackagedProductFactList}>
                      {product.description ? (
                        <p className={styles.reportPackagedProductFact}>{product.description}</p>
                      ) : null}
                      {product.ingredientSummary ? (
                        <p className={styles.reportPackagedProductFact}>
                          <strong>주요 성분</strong> {product.ingredientSummary}
                        </p>
                      ) : null}
                      {product.caution ? (
                        <p className={styles.reportPackagedProductFact}>
                          <strong>추가 확인</strong> {product.caution}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
