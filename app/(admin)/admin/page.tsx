"use client";

import Link from "next/link";
import CategoryManager from "@/components/manager/categoryManager";
import ModelManager from "@/components/manager/modelManager";
import PharmacyProductManager from "@/components/manager/pharmacyProductManager";
import ProductManager from "@/components/manager/productManager";
import styles from "@/components/b2b/B2bUx.module.css";

function OptionalPanel(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <details className={styles.optionalCard}>
      <summary>{props.title}</summary>
      <div className={styles.optionalBody}>
        <p className={styles.optionalText}>{props.description}</p>
        {props.children}
      </div>
    </details>
  );
}

export default function AdminPage() {
  return (
    <div className={`${styles.page} ${styles.compactPage} ${styles.stack}`}>
      <header className={styles.heroCard}>
        <p className={styles.kicker}>ADMIN DASHBOARD</p>
        <h1 className={styles.title}>운영 대시보드</h1>
        <p className={styles.description}>
          기본 운영 흐름은 B2B 임직원 건강 레포트 관리입니다. 나머지 운영 도구는 아래
          옵션 섹션에서 필요할 때만 사용하세요.
        </p>
      </header>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>핵심 업무 바로가기</h2>
            <p className={styles.sectionDescription}>
              임직원 목록 조회, 설문 입력, 분석/약사 코멘트 반영, PDF/PPTX 다운로드를
              한 화면에서 처리합니다.
            </p>
          </div>
        </div>
        <div className={styles.actionRow}>
          <Link href="/admin/b2b-reports" className={styles.buttonPrimary}>
            B2B 임직원 레포트 관리
          </Link>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>기타 운영 도구</h2>
            <p className={styles.sectionDescription}>
              이 섹션은 선택 사항입니다. B2B 레포트 운영과 직접 관련 없는 설정만 모아
              두었습니다.
            </p>
          </div>
        </div>

        <OptionalPanel
          title="AI 모델 설정"
          description="AI 응답 모델이나 관련 운영 파라미터를 조정합니다."
        >
          <ModelManager />
        </OptionalPanel>

        <OptionalPanel
          title="약국 상품 관리"
          description="약국별 판매 상품 매핑 및 재고 연동 설정을 조정합니다."
        >
          <PharmacyProductManager />
        </OptionalPanel>

        <OptionalPanel
          title="상품 관리"
          description="공통 상품 메타데이터와 표시 정보를 관리합니다."
        >
          <ProductManager />
        </OptionalPanel>

        <OptionalPanel
          title="카테고리 관리"
          description="상품 분류 체계를 관리합니다."
        >
          <CategoryManager />
        </OptionalPanel>
      </section>
    </div>
  );
}
