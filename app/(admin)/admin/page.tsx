"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import CategoryManager from "@/components/manager/categoryManager";
import ModelManager from "@/components/manager/modelManager";
import PharmacyProductManager from "@/components/manager/pharmacyProductManager";
import ProductManager from "@/components/manager/productManager";
import styles from "@/components/b2b/B2bUx.module.css";

function ToolPanel(props: {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className={styles.optionalCard} open={props.defaultOpen}>
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
    <div className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_15%_0%,rgba(186,230,253,0.75),transparent_42%),radial-gradient(circle_at_90%_8%,rgba(199,210,254,0.55),transparent_35%),linear-gradient(180deg,#f5f9ff_0%,#e9f0fa_100%)]">
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.compactPage} ${styles.stack}`}>
        <header className={styles.heroCard}>
          <p className={styles.kicker}>ADMIN DASHBOARD</p>
          <h1 className={styles.title}>운영 대시보드</h1>
          <p className={styles.description}>
            관리자 기능을 업무 성격 구분 없이 한 화면에서 동일한 위상으로 관리할 수 있도록 구성했습니다.
            필요한 도구를 펼쳐 바로 작업해 주세요.
          </p>
        </header>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>운영 도구</h2>
              <p className={styles.sectionDescription}>
                B2B 리포트 운영, 데이터 편집, 모델 설정, 상품/카테고리 운영을 동일한 레벨에서 바로 사용할 수
                있습니다.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ToolPanel
              title="B2B 임직원 레포트 관리"
              description="임직원별 설문, 분석, 코멘트, 레이아웃 검증, PDF 내보내기를 처리하는 운영 화면입니다."
              defaultOpen
            >
              <div className={styles.actionRow}>
                <Link href="/admin/b2b-reports" className={styles.buttonPrimary}>
                  레포트 운영 열기
                </Link>
              </div>
            </ToolPanel>

            <ToolPanel
              title="B2B 임직원 데이터 운영"
              description="임직원 기본 정보 및 운영 데이터를 직접 편집하고 점검합니다."
              defaultOpen
            >
              <div className={styles.actionRow}>
                <Link href="/admin/b2b-employee-data" className={styles.buttonSecondary}>
                  데이터 운영 열기
                </Link>
              </div>
            </ToolPanel>

            <ToolPanel
              title="AI 모델 설정"
              description="AI 응답 모델과 운영 파라미터를 관리합니다."
            >
              <ModelManager />
            </ToolPanel>

            <ToolPanel
              title="약국 상품 관리"
              description="약국별 판매 상품 매핑과 연동 설정을 조정합니다."
            >
              <PharmacyProductManager />
            </ToolPanel>

            <ToolPanel title="상품 관리" description="공통 상품 메타데이터와 표시 정보를 관리합니다.">
              <ProductManager />
            </ToolPanel>

            <ToolPanel title="카테고리 관리" description="상품 분류 체계를 관리합니다.">
              <CategoryManager />
            </ToolPanel>
          </div>
        </section>
      </div>
    </div>
  );
}
