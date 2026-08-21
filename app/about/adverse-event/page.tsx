import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { BUSINESS_SUPPORT_EMAIL, BUSINESS_SUPPORT_PHONE } from "@/lib/site-identity";
import AdverseEventReportForm from "@/components/adverse-event/AdverseEventReportForm.client";

export const metadata: Metadata = createPageMetadata({
  title: "이상반응 신고 | 웰니스박스",
  description:
    "건강기능식품을 드시고 몸에 이상이 있었다면 알려주세요. 접수한 내용은 약사가 확인합니다.",
  path: "/about/adverse-event",
  keywords: ["건강기능식품 이상반응", "부작용 신고", "웰니스박스 이상반응"],
});

export default function AdverseEventPage() {
  return (
    <section className="w-full bg-[linear-gradient(180deg,#f6fbff_0%,#ffffff_28%,#ffffff_100%)]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-7 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.4)] sm:p-10">
          <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">
            ADVERSE EVENT REPORT
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            이상반응 신고
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            건강기능식품을 드시고 몸에 이상이 있었다면 알려주세요. 접수한 내용은
            약사가 확인하고, 같은 일이 반복되지 않도록 제품 안내에 반영합니다.
          </p>

          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-bold text-rose-900">지금 많이 아프시다면</p>
            <p className="mt-2 text-sm leading-6 text-rose-800">
              숨쉬기 힘들거나, 얼굴이나 목이 붓거나, 의식이 흐려지면 이 화면을 닫고
              119에 전화하거나 바로 병원에 가세요. 이 신고는 응급 창구가 아닙니다.
            </p>
          </div>

          <AdverseEventReportForm />

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-sm leading-6 text-slate-600">
              전화나 메일이 편하시면 이렇게 알려주셔도 됩니다.
              <br />
              전화 {BUSINESS_SUPPORT_PHONE} / 메일 {BUSINESS_SUPPORT_EMAIL}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              식품의약품안전처 건강기능식품 이상사례 신고센터에도 신고하실 수 있습니다.
              여기 남기신 내용은 저희가 확인하는 용도이고, 공식 신고를 대신하지 않습니다.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
