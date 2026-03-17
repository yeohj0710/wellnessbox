/* eslint-disable @next/next/no-img-element */
import styles from "../B2bUx.module.css";
import type { ReportSummaryAddendumModel } from "./detail-data-model";

type ReportSummaryAddendumPageProps = {
  pageNumber: number;
  metaEmployeeName: string;
  addendum: ReportSummaryAddendumModel;
};

export default function ReportSummaryAddendumPage(
  props: ReportSummaryAddendumPageProps
) {
  const { pageNumber, metaEmployeeName, addendum } = props;

  return (
    <section
      className={`${styles.reportSheet} ${styles.reportSheetThird}`}
      data-report-page={String(pageNumber)}
    >
      <header className={styles.reportPageHeader}>
        <p className={styles.reportPageKicker}>{`${pageNumber}페이지 추가 안내`}</p>
        <h2 className={styles.reportPageTitle}>약사 코멘트와 패키지 구성</h2>
        <p className={styles.reportPageSubtitle}>
          상담 요약과 이번 달 패키지 제품 정보를 마지막 장에 함께 정리했습니다.
        </p>
      </header>

      <div className={styles.reportSecondStack}>
        {addendum.consultationSummary ? (
          <article className={styles.reportDataCard}>
            <h3 className={styles.reportDataTitle}>약사 코멘트</h3>
            <p className={styles.reportBlockLead}>{addendum.consultationSummary}</p>
          </article>
        ) : null}

        {addendum.packagedProducts.length > 0 ? (
          <article className={styles.reportDataCard}>
            <div className={styles.reportDataHeadRow}>
              <h3 className={styles.reportDataTitle}>이번 패키지 제품 정보</h3>
            </div>
            <div className={styles.reportPackagedProductList}>
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

                    {product.description ? (
                      <p className={styles.reportDataBody}>{product.description}</p>
                    ) : null}
                    {product.ingredientSummary ? (
                      <p className={styles.reportDataBody}>
                        <strong>주요 성분</strong> {product.ingredientSummary}
                      </p>
                    ) : null}
                    {product.intakeSummary ? (
                      <p className={styles.reportDataBody}>
                        <strong>섭취 안내</strong> {product.intakeSummary}
                      </p>
                    ) : null}
                    {product.caution ? (
                      <p className={styles.reportDataBody}>
                        <strong>함께 확인할 점</strong> {product.caution}
                      </p>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </article>
        ) : null}
      </div>

      <div className={styles.reportFinalCommentFooter}>
        <span>맞춤 안내 대상</span>
        <strong>{metaEmployeeName}</strong>
      </div>
    </section>
  );
}
