import {
  SparklesIcon,
  ShieldCheckIcon,
  BoltIcon,
  MoonIcon,
  HeartIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
  BarRow,
  BigChip,
  Donut,
  Gauge,
  Legend,
  MiniStat,
  PlanCard,
} from "./reportBlocks";

export const dynamic = "force-dynamic";

const A4_WIDTH = 794;
const A4_HEIGHT = 1270;

const REPORT_FIXTURE = {
  brand: "Wellnessbox",
  person: { name: "김애니", age: 34, gender: "여성" },
  meta: { date: "2026.02.02", next: "2026.03.02", id: "WB-RPT-0137" },
  overall: 84,
  priorities: [
    { label: "수면", score: 62, Icon: MoonIcon, color: "indigo" as const },
    { label: "피로", score: 58, Icon: BoltIcon, color: "amber" as const },
    { label: "심혈관", score: 78, Icon: HeartIcon, color: "rose" as const },
    {
      label: "면역",
      score: 81,
      Icon: ShieldCheckIcon,
      color: "emerald" as const,
    },
  ],
  donut: [
    { label: "부족", value: 45, color: "#6366F1" },
    { label: "보통", value: 35, color: "#06B6D4" },
    { label: "양호", value: 20, color: "#22C55E" },
  ],
  plan: [
    {
      when: "아침",
      items: ["비타민 D", "오메가-3"],
      tint: "from-indigo-600 to-sky-500",
    },
    {
      when: "점심",
      items: ["비타민 C", "아연(격일)"],
      tint: "from-fuchsia-600 to-indigo-500",
    },
    {
      when: "저녁",
      items: ["마그네슘"],
      tint: "from-emerald-600 to-teal-500",
    },
  ],
};

export default function PersonalHealthReportA4() {
  const { brand, person, meta, overall, priorities, donut, plan } = REPORT_FIXTURE;

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="a4-scale mx-auto" style={{ width: A4_WIDTH }}>
        <div
          className="relative overflow-hidden bg-white shadow-[0_30px_120px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
          style={{ width: A4_WIDTH, height: A4_HEIGHT }}
        >
          <div className="h-full px-8 pt-8 pb-7 flex flex-col">
            <header className="grid grid-cols-12 gap-5 items-start">
              <div className="col-span-7 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-500 text-white shadow-sm">
                    <SparklesIcon className="h-6 w-6" />
                  </div>
                  <div className="text-base font-extrabold text-gray-950">{brand}</div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 ring-1 ring-indigo-100">
                    개인 건강관리 리포트
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-extrabold tracking-tight text-gray-950">
                    {person.name}님 리포트
                  </div>
                  <div className="mt-1.5 text-lg font-semibold text-gray-700">
                    {person.age}세 · {person.gender}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <MiniStat
                      title="이번 달 목표"
                      value="피로 개선"
                      sub="체감 회복"
                      accent="amber"
                    />
                    <MiniStat
                      title="우선순위"
                      value="수면"
                      sub="고정 리듬"
                      accent="indigo"
                    />
                    <MiniStat
                      title="권장 습관"
                      value="카페인 감량"
                      sub="오후 2시 이후"
                      accent="emerald"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-5">
                <div className="rounded-3xl p-5 text-white shadow-sm bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white/70">Report ID</div>
                      <div className="mt-1 text-sm font-extrabold">{meta.id}</div>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-extrabold">
                      {meta.date}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white/70">종합 점수</div>
                      <div className="mt-1 text-5xl font-extrabold tracking-tight">
                        {overall}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/70">
                        100점 만점
                      </div>
                    </div>
                    <Gauge value={overall} />
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm font-extrabold text-white/85">
                    <CalendarDaysIcon className="h-5 w-5" />
                    다음 평가: {meta.next}
                  </div>
                </div>
              </div>
            </header>

            <main className="mt-5 flex-1 min-h-0">
              <section className="grid grid-cols-12 gap-5">
                <div className="col-span-6 rounded-3xl border border-gray-200 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-xs font-extrabold tracking-wide text-gray-500">
                        신호 지표
                      </div>
                      <div className="mt-1.5 text-2xl font-extrabold text-gray-950">
                        우선 관리 영역
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-extrabold text-slate-700">
                      최근 7일 반영
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {priorities.map((priority) => (
                      <BarRow
                        key={priority.label}
                        label={priority.label}
                        value={priority.score}
                        Icon={priority.Icon}
                        color={priority.color}
                      />
                    ))}
                  </div>
                </div>

                <div className="col-span-6 rounded-3xl border border-gray-200 p-5">
                  <div className="text-xs font-extrabold tracking-wide text-gray-500">
                    영양 밸런스
                  </div>
                  <div className="mt-1.5 text-2xl font-extrabold text-gray-950">
                    한눈에 보기
                  </div>

                  <div className="mt-4 flex items-center gap-5">
                    <Donut segments={donut} />
                    <div className="space-y-2.5 flex-1">
                      {donut.map((segment) => (
                        <Legend
                          key={segment.label}
                          label={segment.label}
                          value={`${segment.value}%`}
                          dotColor={segment.color}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl p-4 text-white shadow-sm bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500">
                    <div className="text-sm font-extrabold">이번 달 요약</div>
                    <div className="mt-1.5 text-lg font-semibold text-white/95">
                      수면 리듬 고정 + 오후 카페인 감량 + 마그네슘 보강
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <BigChip title="부족 TOP" value="비타민 D" accent="indigo" />
                    <BigChip title="부족 TOP" value="마그네슘" accent="emerald" />
                    <BigChip title="부족 TOP" value="오메가-3" accent="sky" />
                    <BigChip title="체감 목표" value="피로 개선" accent="amber" />
                  </div>
                </div>
              </section>

              <section className="mt-5 gap-5">
                <div className="col-span-6 rounded-3xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-extrabold tracking-wide text-gray-500">
                        제품 패키지 구성
                      </div>
                      <div className="mt-1.5 text-2xl font-extrabold text-gray-950">
                        복용 가이드
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-extrabold text-emerald-700 ring-1 ring-emerald-100">
                      1일 기준
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {plan.map((item) => (
                      <PlanCard
                        key={item.when}
                        when={item.when}
                        items={item.items}
                        tint={item.tint}
                      />
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="text-sm font-extrabold text-gray-900">
                      복용 팁 한 가지
                    </div>
                    <div className="mt-1.5 text-base font-semibold text-gray-800 leading-relaxed">
                      마그네슘은{" "}
                      <span className="font-extrabold text-indigo-700">
                        취침 1~2시간 전
                      </span>
                      에 복용하면 좋아요.
                    </div>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>

      <style>{`
        .a4-scale {
          transform-origin: top center;
          transform: scale(1);
        }
        @media (max-width: 860px) {
          .a4-scale {
            transform: scale(calc((100vw - 24px) / 794));
          }
        }

        @media print {
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4; margin: 0; }
          .a4-scale { transform: none !important; }
          .shadow-\\[0_30px_120px_rgba\\(0\\,0\\,0\\,0\\.18\\)\\] { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
