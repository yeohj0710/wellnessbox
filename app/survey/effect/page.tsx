import type { Metadata } from "next";
import ProOutcomeForm from "@/components/pro-outcome/ProOutcomeForm.client";

// 링크를 받은 분만 들어오는 화면이다. 검색에 걸리면 짝 없는 응답이 쌓인다.
export const metadata: Metadata = {
  title: "복용 전후 설문 | 웰니스박스",
  robots: { index: false, follow: false },
};

type SearchParams = { t?: string; phase?: string };

export default async function EffectSurveyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const participantToken = (params.t ?? "").trim();
  const phase = params.phase === "followup" ? "FOLLOWUP" : "BASELINE";
  const isFollowup = phase === "FOLLOWUP";

  if (participantToken.length < 16) {
    return (
      <section className="w-full bg-white">
        <div className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            참여 링크를 확인해 주세요
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            이 설문은 받으신 링크로 들어오셔야 답할 수 있습니다. 복용 전 답과 2주 뒤 답을
            짝지어야 해서, 링크 안의 번호가 필요합니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-[linear-gradient(180deg,#f6fbff_0%,#ffffff_28%,#ffffff_100%)]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-7 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.4)] sm:p-10">
          <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">
            {isFollowup ? "FOLLOW-UP" : "BASELINE"}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {isFollowup ? "2주 뒤 설문" : "복용 전 설문"}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            {isFollowup
              ? "2주 전에 답해 주셨던 것과 같은 문항입니다. 그때와 지금이 어떻게 달라졌는지 보려고 여쭙습니다. 1분이면 끝납니다."
              : "드시기 전 상태를 먼저 여쭙습니다. 2주 뒤에 같은 문항을 한 번 더 여쭤보고, 두 답을 견줍니다. 1분이면 끝납니다."}
          </p>

          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <p className="text-sm font-bold text-sky-900">이 설문은 왜 하나요</p>
            <p className="mt-2 text-sm leading-6 text-sky-800">
              드신 제품이 실제로 도움이 됐는지 저희가 알 방법은 드신 분께 여쭤보는 것뿐입니다.
              모아 주신 답은 제품 안내와 추천을 고치는 데 씁니다. 진단이나 치료를 대신하지
              않습니다.
            </p>
          </div>

          <ProOutcomeForm phase={phase} participantToken={participantToken} />
        </section>
      </div>
    </section>
  );
}
