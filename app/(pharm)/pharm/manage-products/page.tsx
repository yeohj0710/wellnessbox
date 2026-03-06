"use client";

import { useEffect, useState } from "react";
import {
  BuildingStorefrontIcon,
  CubeIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import CategoryManager from "@/components/manager/categoryManager";
import FullPageLoader from "@/components/common/fullPageLoader";
import PharmacyProductManager from "@/components/manager/pharmacyProductManager";
import ProductManager from "@/components/manager/productManager";
import { getPharmacy } from "@/lib/pharmacy";

const TABS = [
  {
    key: "inventory",
    label: "약국 상품 운영",
    description: "현재 약국의 가격, 재고, 판매 옵션을 빠르게 관리합니다.",
    icon: <BuildingStorefrontIcon className="h-5 w-5" />,
  },
  {
    key: "products",
    label: "상품 마스터",
    description: "공통 상품명, 설명, 카테고리 연결을 관리합니다.",
    icon: <CubeIcon className="h-5 w-5" />,
  },
  {
    key: "categories",
    label: "카테고리 체계",
    description: "카테고리와 대표 이미지를 정리합니다.",
    icon: <RectangleStackIcon className="h-5 w-5" />,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ManageProducts() {
  const router = useRouter();
  const [pharm, setPharm] = useState<{ id: number; name: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("inventory");

  useEffect(() => {
    void (async () => {
      const pharmacy = await getPharmacy();
      if (!pharmacy) {
        router.push("/pharm-login");
        return;
      }
      setPharm(pharmacy);
      setIsLoading(false);
    })();
  }, [router]);

  if (isLoading || !pharm) return <FullPageLoader />;

  return (
    <div className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_15%_0%,rgba(125,211,252,0.7),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(191,219,254,0.72),transparent_26%),linear-gradient(180deg,#f7fbff_0%,#edf4fb_100%)]">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-slate-200/80 bg-white/88 px-6 py-8 shadow-[0_30px_90px_-44px_rgba(15,23,42,0.4)] backdrop-blur sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-700/75">
            Pharmacy Workspace
          </p>
          <div className="mt-3 space-y-3">
            <h1 className="text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-[3rem]">
              상품 운영 워크스페이스
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
              {pharm.name || "현재 약국"}의 판매 상품, 공통 상품 마스터, 카테고리 체계를 한 화면에서 빠르게 전환하며 관리할 수 있도록 재구성했습니다.
            </p>
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-3">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[26px] border p-5 text-left shadow-[0_20px_60px_-40px_rgba(15,23,42,0.42)] transition ${
                  active
                    ? "border-sky-200 bg-white text-slate-950"
                    : "border-slate-200/80 bg-white/78 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  {tab.icon}
                </div>
                <div className="mt-4 space-y-2">
                  <h2 className="text-lg font-black tracking-[-0.03em]">{tab.label}</h2>
                  <p className="text-sm leading-6 text-slate-500">{tab.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === "inventory" ? <PharmacyProductManager pharmacyId={pharm.id} /> : null}
          {activeTab === "products" ? <ProductManager /> : null}
          {activeTab === "categories" ? <CategoryManager /> : null}
        </div>
      </div>
    </div>
  );
}
