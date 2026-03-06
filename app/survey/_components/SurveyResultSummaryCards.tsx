"use client";

import type { SurveyResultSummaryMetrics } from "@/app/survey/_lib/survey-result-summary";
import {
  SURVEY_RESULT_DONUT_CIRCUMFERENCE,
  SURVEY_RESULT_DONUT_RADIUS,
} from "@/app/survey/_lib/survey-result-summary";

type SurveyResultSummaryCardsProps = {
  summaryMetrics: SurveyResultSummaryMetrics;
  scoreHealthLabel: string;
  scoreRiskLabel: string;
};

export default function SurveyResultSummaryCards({
  summaryMetrics,
  scoreHealthLabel,
  scoreRiskLabel,
}: SurveyResultSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">{scoreHealthLabel}</p>
        <div className="mt-2 grid justify-items-center gap-2">
          <div className="relative h-[112px] w-[112px] shrink-0">
            <svg
              viewBox="0 0 120 120"
              className="h-full w-full"
              role="img"
              aria-label="건강점수 원형 차트"
            >
              <circle
                cx="60"
                cy="60"
                r={SURVEY_RESULT_DONUT_RADIUS}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={SURVEY_RESULT_DONUT_RADIUS}
                fill="none"
                stroke="#16A34A"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={SURVEY_RESULT_DONUT_CIRCUMFERENCE}
                strokeDashoffset={summaryMetrics.donutOffset}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-3xl font-extrabold text-slate-900">
                {summaryMetrics.healthScore}
                <span className="ml-0.5 text-xl">점</span>
              </p>
            </div>
          </div>
          <p className="max-w-[220px] text-center text-[11px] leading-relaxed text-slate-500">
            건강점수 = 100 - ((생활습관 위험도 + 건강관리 위험도 평균) / 2)
          </p>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">{scoreRiskLabel}</p>
        <div className="mt-2 grid justify-items-center">
          <svg
            viewBox="0 0 240 210"
            className="h-auto w-full max-w-[252px]"
            role="img"
            aria-label="생활습관 위험도 레이더 그래프"
          >
            {summaryMetrics.radarLevelPolygons.map((levelPolygon) => (
              <polygon
                key={`survey-radar-level-${levelPolygon.level}`}
                points={levelPolygon.points}
                fill="none"
                stroke="#d7e3f7"
                strokeWidth="1"
              />
            ))}
            {summaryMetrics.radarAxes.map((axis) => (
              <line
                key={`survey-radar-axis-${axis.id}`}
                x1={summaryMetrics.radarCenterX}
                y1={summaryMetrics.radarCenterY}
                x2={axis.outerX}
                y2={axis.outerY}
                stroke="#cad8ef"
                strokeWidth="1"
              />
            ))}
            <polygon
              points={summaryMetrics.radarAreaPoints}
              fill="rgba(239,68,68,0.2)"
              stroke="#dc2626"
              strokeWidth="2"
            />
            {summaryMetrics.radarAxes.map((axis) => (
              <circle
                key={`survey-radar-point-${axis.id}`}
                cx={axis.valueX}
                cy={axis.valueY}
                r="3"
                fill="#fff7f7"
                stroke="#b91c1c"
                strokeWidth="2"
              />
            ))}
            {summaryMetrics.radarAxes.map((axis) => (
              <text
                key={`survey-radar-label-${axis.id}`}
                x={axis.labelX}
                y={axis.labelY}
                textAnchor={axis.labelAnchor}
                dominantBaseline="central"
                fill="#4b5563"
                fontSize="11.5"
                fontWeight="700"
              >
                {axis.labelLines.map((labelLine, lineIndex) => (
                  <tspan
                    key={`survey-radar-label-line-${axis.id}-${lineIndex}`}
                    x={axis.labelX}
                    dy={lineIndex === 0 ? "-0.35em" : "1.1em"}
                  >
                    {labelLine}
                  </tspan>
                ))}
                <tspan x={axis.labelX} dy="1.2em" fill="#be123c" fontSize="12.5" fontWeight="800">
                  {axis.percent}점
                </tspan>
              </text>
            ))}
          </svg>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          종합 위험도 <span className="font-semibold text-rose-600">{summaryMetrics.lifestyleOverall}점</span>
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:min-h-[220px] sm:flex sm:flex-col">
        <p className="text-sm font-semibold text-slate-900">건강관리 위험도</p>
        <div className="mt-3">
          {summaryMetrics.sectionNeedRows.length === 0 ? (
            <p className="text-xs text-slate-500">선택한 세부 영역 데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2.5">
              {summaryMetrics.sectionNeedRows.map((section) => (
                <li key={`need-${section.sectionId}`}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate pr-2">{section.sectionTitle}</span>
                    <span className="font-semibold text-rose-600">{section.percent}점</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                      style={{ width: `${section.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            평균 위험도 <span className="font-semibold text-rose-600">{summaryMetrics.healthNeedAverage}점</span>
          </p>
        </div>
      </article>
    </div>
  );
}
