import React from "react";
import {
  SparklesIcon,
  ShieldCheckIcon,
  BoltIcon,
  MoonIcon,
  HeartIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export default function PersonalHealthReportA4() {
  // ✅ 완전 하드코딩(가상 데이터)
  const brand = "Wellnessbox";
  const person = { name: "김웰니스", age: 34, gender: "남" };
  const meta = { date: "2026.02.02", next: "2026.03.02", id: "WB-RPT-0137" };

  const overall = 84; // 0~100

  const priorities = [
    { label: "수면", score: 62, Icon: MoonIcon, color: "indigo" as const },
    { label: "피로", score: 58, Icon: BoltIcon, color: "amber" as const },
    { label: "심혈/활력", score: 78, Icon: HeartIcon, color: "rose" as const },
    {
      label: "면역",
      score: 81,
      Icon: ShieldCheckIcon,
      color: "emerald" as const,
    },
  ];

  const trend7d = [62, 66, 63, 70, 68, 72, 75]; // 임의
  const donut = [
    { label: "부족", value: 45, color: "#6366F1" }, // indigo-500
    { label: "보통", value: 35, color: "#06B6D4" }, // cyan-500
    { label: "양호", value: 20, color: "#22C55E" }, // green-500
  ];

  const plan = [
    {
      when: "아침",
      items: ["비타민 D", "오메가-3"],
      tint: "from-indigo-600 to-sky-500",
    },
    {
      when: "점심",
      items: ["비타민B", "아연(격일)"],
      tint: "from-fuchsia-600 to-indigo-500",
    },
    {
      when: "저녁",
      items: ["마그네슘"],
      tint: "from-emerald-600 to-teal-500",
    },
  ];

  // ✅ 페이지 넘침 방지: 문구는 유지하되 블록 높이 줄이기
  const actions = [
    "오후 2시 이후 카페인 제한",
    "취침/기상 시간 60분 이내로 고정",
    "점심 직후 10분 걷기(주 4회)",
  ];

  // A4 픽셀 (캡쳐용)
  const A4_W = 794;
  const A4_H = 1270;

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      {/* ✅ 뷰포트가 좁을 때 A4를 줄여 보여주기 (레이아웃 깨짐 방지) */}
      <div className="a4-scale mx-auto" style={{ width: A4_W }}>
        {/* A4 종이 */}
        <div
          className="relative overflow-hidden bg-white shadow-[0_30px_120px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
          style={{ width: A4_W, height: A4_H }}
        >
          {/* ✅ h-full + flex-col로 footer 겹침 방지 */}
          <div className="h-full px-8 pt-8 pb-7 flex flex-col">
            {/* Header */}
            <header className="grid grid-cols-12 gap-5 items-start">
              {/* Left (프로필 + 빈 공간 채우기) */}
              <div className="col-span-7 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-500 text-white shadow-sm">
                    <SparklesIcon className="h-6 w-6" />
                  </div>
                  <div className="text-base font-extrabold text-gray-950">
                    {brand}
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 ring-1 ring-indigo-100">
                    개인 건강관리 레포트
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-extrabold tracking-tight text-gray-950">
                    {person.name} 님 리포트
                  </div>
                  <div className="mt-1.5 text-lg font-semibold text-gray-700">
                    {person.age}세 · {person.gender}
                  </div>

                  {/* ✅ 비어보이던 영역 채우기: 요약 카드 + 핵심 포인트 */}
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <MiniStat
                      title="이번달 목표"
                      value="피로↓"
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
                      title="권장 포인트"
                      value="카페인 감량"
                      sub="오후 2시 이후"
                      accent="emerald"
                    />
                  </div>
                </div>
              </div>

              {/* Right (Score Card) */}
              <div className="col-span-5">
                <div className="rounded-3xl p-5 text-white shadow-sm bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white/70">
                        Report ID
                      </div>
                      <div className="mt-1 text-sm font-extrabold">
                        {meta.id}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-extrabold">
                      {meta.date}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white/70">
                        종합 점수
                      </div>
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
                    다음 점검: {meta.next}
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="mt-5 flex-1 min-h-0">
              {/* ✅ 두 박스 반반: col-span-6 + col-span-6 */}
              <section className="grid grid-cols-12 gap-5">
                {/* Priority Bars */}
                <div className="col-span-6 rounded-3xl border border-gray-200 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-xs font-extrabold tracking-wide text-gray-500">
                        핵심 지표
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
                    {priorities.map((p) => (
                      <BarRow
                        key={p.label}
                        label={p.label}
                        value={p.score}
                        Icon={p.Icon}
                        color={p.color}
                      />
                    ))}
                  </div>
                </div>

                {/* Donut + Quick takeaways */}
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
                      {donut.map((d) => (
                        <Legend
                          key={d.label}
                          label={d.label}
                          value={`${d.value}%`}
                          dotColor={d.color}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl p-4 text-white shadow-sm bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500">
                    <div className="text-sm font-extrabold">이번 달 핵심</div>
                    <div className="mt-1.5 text-lg font-semibold text-white/95">
                      “수면 고정 + 오후 카페인 줄이기 + 마그네슘”
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <BigChip
                      title="부족 TOP"
                      value="비타민 D"
                      accent="indigo"
                    />
                    <BigChip
                      title="부족 TOP"
                      value="마그네슘"
                      accent="emerald"
                    />
                    <BigChip title="부족 TOP" value="오메가-3" accent="sky" />
                    <BigChip title="체감 목표" value="피로↓" accent="amber" />
                  </div>
                </div>
              </section>

              {/* ✅ 아래도 넘침 방지 + 균형감: 반반(6/6) */}
              <section className="mt-5 gap-5">
                {/* Plan */}
                <div className="col-span-6 rounded-3xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-extrabold tracking-wide text-gray-500">
                        소분 패키지 구성
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
                    {plan.map((p) => (
                      <PlanCard
                        key={p.when}
                        when={p.when}
                        items={p.items}
                        tint={p.tint}
                      />
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="text-sm font-extrabold text-gray-900">
                      복용 팁(핵심 1개)
                    </div>
                    <div className="mt-1.5 text-base font-semibold text-gray-800 leading-relaxed">
                      마그네슘은{" "}
                      <span className="font-extrabold text-indigo-700">
                        취침 1~2시간 전
                      </span>
                      이 가장 좋습니다.
                    </div>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>

      {/* ✅ styled-jsx 없이 순수 style */}
      <style>{`
        /* 화면이 좁아도 A4가 "줄어들어 보이게" 처리 (줄바꿈 증가로 높이 늘어나는 문제 방지) */
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

/* ---------------- Visual components (SVG) ---------------- */

function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 24;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="10"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgba(99,102,241,0.95)" /* indigo */
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-sm font-extrabold text-white">{v}%</div>
      </div>
    </div>
  );
}

function colorToBg(color: "indigo" | "amber" | "rose" | "emerald") {
  switch (color) {
    case "indigo":
      return {
        pill: "bg-indigo-100 text-indigo-700 ring-indigo-200",
        bar: "from-indigo-600 to-sky-500",
      };
    case "amber":
      return {
        pill: "bg-amber-100 text-amber-800 ring-amber-200",
        bar: "from-amber-500 to-orange-500",
      };
    case "rose":
      return {
        pill: "bg-rose-100 text-rose-800 ring-rose-200",
        bar: "from-rose-500 to-fuchsia-500",
      };
    case "emerald":
      return {
        pill: "bg-emerald-100 text-emerald-800 ring-emerald-200",
        bar: "from-emerald-500 to-teal-500",
      };
  }
}

function BarRow({
  label,
  value,
  Icon,
  color,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<any>;
  color: "indigo" | "amber" | "rose" | "emerald";
}) {
  const v = Math.max(0, Math.min(100, value));
  const grade = v >= 80 ? "양호" : v >= 65 ? "보통" : "관리";
  const tone = colorToBg(color);

  return (
    <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <div className="text-base font-extrabold text-gray-950">
              {label}
            </div>
            <div className="mt-0.5">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${tone.pill}`}
              >
                {grade}
              </span>
            </div>
          </div>
        </div>

        <div className="text-2xl font-extrabold text-gray-950">{v}</div>
      </div>

      <div className="mt-2.5 h-4 w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 520;
  const h = 120;
  const pad = 10;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const dx = (w - pad * 2) / (values.length - 1 || 1);

  const points = values
    .map((v, i) => {
      const t = max === min ? 0.5 : (v - min) / (max - min);
      const x = pad + i * dx;
      const y = pad + (1 - t) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full">
      <defs>
        <linearGradient id="spark" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="0.5" stopColor="#06B6D4" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
      </defs>

      <path
        d={`M ${pad} ${h - pad} L ${w - pad} ${h - pad}`}
        stroke="rgba(0,0,0,0.08)"
        strokeWidth="2"
      />
      <polyline
        points={points}
        fill="none"
        stroke="url(#spark)"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => {
        const t = max === min ? 0.5 : (v - min) / (max - min);
        const x = pad + i * dx;
        const y = pad + (1 - t) * (h - pad * 2);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={7}
            fill="white"
            stroke="rgba(2,6,23,0.85)"
            strokeWidth="4"
          />
        );
      })}
    </svg>
  );
}

function Donut({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 44;
  const c = 2 * Math.PI * r;

  let acc = 0;

  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36">
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="rgba(2,6,23,0.06)"
        strokeWidth="18"
      />
      {segments.map((s) => {
        const frac = s.value / total;
        const dash = frac * c;
        const gap = c - dash;
        const offset = -acc * c;
        acc += frac;

        return (
          <circle
            key={s.label}
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
          />
        );
      })}
      <circle cx="60" cy="60" r="30" fill="white" />
      <text
        x="60"
        y="56"
        textAnchor="middle"
        className="fill-slate-950"
        style={{ fontSize: 14, fontWeight: 900 }}
      >
        밸런스
      </text>
      <text
        x="60"
        y="78"
        textAnchor="middle"
        className="fill-slate-600"
        style={{ fontSize: 12, fontWeight: 800 }}
      >
        {segments[0]?.value ?? 0}% 부족
      </text>
    </svg>
  );
}

/* ---------------- Small UI blocks ---------------- */

function Legend({
  label,
  value,
  dotColor,
}: {
  label: string;
  value: string;
  dotColor: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <div className="text-sm font-extrabold text-gray-900">{label}</div>
        </div>
        <div className="text-lg font-extrabold text-gray-700">{value}</div>
      </div>
    </div>
  );
}

function BigChip({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent: "indigo" | "emerald" | "sky" | "amber";
}) {
  const cls =
    accent === "indigo"
      ? "bg-indigo-50 ring-indigo-100 text-indigo-800"
      : accent === "emerald"
      ? "bg-emerald-50 ring-emerald-100 text-emerald-800"
      : accent === "sky"
      ? "bg-sky-50 ring-sky-100 text-sky-800"
      : "bg-amber-50 ring-amber-100 text-amber-800";

  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${cls}`}>
      <div className="text-xs font-extrabold tracking-wide opacity-70">
        {title}
      </div>
      <div className="mt-1 text-lg font-extrabold text-slate-950">{value}</div>
    </div>
  );
}

function PlanCard({
  when,
  items,
  tint,
}: {
  when: string;
  items: string[];
  tint: string;
}) {
  return (
    <div
      className={`rounded-3xl p-4 text-white shadow-sm bg-gradient-to-br ${tint}`}
    >
      <div className="text-sm font-extrabold text-white/90">{when}</div>
      <ul className="mt-3 space-y-1.5">
        {items.map((it) => (
          <li key={it} className="text-base font-semibold leading-snug">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string;
  sub: string;
  accent: "indigo" | "amber" | "emerald";
}) {
  const cls =
    accent === "indigo"
      ? "bg-indigo-50 ring-indigo-100"
      : accent === "amber"
      ? "bg-amber-50 ring-amber-100"
      : "bg-emerald-50 ring-emerald-100";

  const valueCls =
    accent === "indigo"
      ? "text-indigo-800"
      : accent === "amber"
      ? "text-amber-800"
      : "text-emerald-800";

  return (
    <div className={`rounded-2xl p-4 ring-1 ${cls}`}>
      <div className="text-xs font-extrabold tracking-wide text-slate-600">
        {title}
      </div>
      <div className={`mt-1 text-lg font-extrabold ${valueCls}`}>{value}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-700">{sub}</div>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200">
      {text}
    </span>
  );
}
