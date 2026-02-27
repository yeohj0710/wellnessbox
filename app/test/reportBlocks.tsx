import React from "react";

type AccentColor = "indigo" | "amber" | "rose" | "emerald";

function colorToBg(color: AccentColor) {
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

export function Gauge({ value }: { value: number }) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const dash = (normalizedValue / 100) * circumference;

  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="10"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(99,102,241,0.95)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-sm font-extrabold text-white">{normalizedValue}%</div>
      </div>
    </div>
  );
}

export function BarRow({
  label,
  value,
  Icon,
  color,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<React.ComponentProps<"svg">>;
  color: AccentColor;
}) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const grade =
    normalizedValue >= 80 ? "양호" : normalizedValue >= 65 ? "보통" : "관리 필요";
  const tone = colorToBg(color);

  return (
    <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <div className="text-base font-extrabold text-gray-950">{label}</div>
            <div className="mt-0.5">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${tone.pill}`}
              >
                {grade}
              </span>
            </div>
          </div>
        </div>

        <div className="text-2xl font-extrabold text-gray-950">
          {normalizedValue}
        </div>
      </div>

      <div className="mt-2.5 h-4 w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}

export function Donut({
  segments,
  centerTitle = "밸런스",
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  centerTitle?: string;
}) {
  const total = segments.reduce((acc, segment) => acc + segment.value, 0) || 1;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36">
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="rgba(2,6,23,0.06)"
        strokeWidth="18"
      />
      {segments.map((segment) => {
        const fraction = segment.value / total;
        const dash = fraction * circumference;
        const gap = circumference - dash;
        const offset = -accumulated * circumference;
        accumulated += fraction;

        return (
          <circle
            key={segment.label}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={segment.color}
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
        {centerTitle}
      </text>
      <text
        x="60"
        y="78"
        textAnchor="middle"
        className="fill-slate-600"
        style={{ fontSize: 12, fontWeight: 800 }}
      >
        {`${segments[0]?.value ?? 0}% 부족`}
      </text>
    </svg>
  );
}

export function Legend({
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

export function BigChip({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent: "indigo" | "emerald" | "sky" | "amber";
}) {
  const className =
    accent === "indigo"
      ? "bg-indigo-50 ring-indigo-100 text-indigo-800"
      : accent === "emerald"
      ? "bg-emerald-50 ring-emerald-100 text-emerald-800"
      : accent === "sky"
      ? "bg-sky-50 ring-sky-100 text-sky-800"
      : "bg-amber-50 ring-amber-100 text-amber-800";

  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${className}`}>
      <div className="text-xs font-extrabold tracking-wide opacity-70">
        {title}
      </div>
      <div className="mt-1 text-lg font-extrabold text-slate-950">{value}</div>
    </div>
  );
}

export function PlanCard({
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
        {items.map((item) => (
          <li key={item} className="text-base font-semibold leading-snug">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MiniStat({
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
  const className =
    accent === "indigo"
      ? "bg-indigo-50 ring-indigo-100"
      : accent === "amber"
      ? "bg-amber-50 ring-amber-100"
      : "bg-emerald-50 ring-emerald-100";

  const valueClassName =
    accent === "indigo"
      ? "text-indigo-800"
      : accent === "amber"
      ? "text-amber-800"
      : "text-emerald-800";

  return (
    <div className={`rounded-2xl p-4 ring-1 ${className}`}>
      <div className="text-xs font-extrabold tracking-wide text-slate-600">
        {title}
      </div>
      <div className={`mt-1 text-lg font-extrabold ${valueClassName}`}>
        {value}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-slate-700">{sub}</div>
    </div>
  );
}
