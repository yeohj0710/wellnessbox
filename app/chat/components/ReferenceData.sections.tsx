"use client";

import Link from "next/link";
import PersonalizedValuePropositionCard from "@/components/common/PersonalizedValuePropositionCard";
import PersonalizedTrustPanel from "@/components/common/PersonalizedTrustPanel";
import type { UserContextSummary } from "@/lib/chat/context";
import { resolvePersonalizedValueProposition } from "@/lib/value-proposition/engine";
import type {
  NormalizedAssessResult,
  NormalizedCheckAiResult,
  NormalizedHealthLinkSummary,
  NormalizedOrderSummary,
} from "../hooks/useChat.results";

function formatKo(dt: string | number | Date | null) {
  const source = dt ?? Date.now();
  const resolved = source instanceof Date ? source : new Date(source);
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(resolved);
  } catch {
    return resolved.toLocaleString("ko-KR");
  }
}

function clip(text: string, max = 60) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

type ReferenceValueProposition = ReturnType<
  typeof resolvePersonalizedValueProposition
>;

export function ReferenceDataOrderSection({
  order,
}: {
  order: NormalizedOrderSummary;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="font-medium text-slate-600">최근 주문</div>
        <div className="text-[10px] text-slate-400">
          {formatKo(order.updatedAt)}
        </div>
      </div>
      {order.items.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {order.items.map((item, idx) => (
            <li key={idx} className="text-slate-600">
              {clip(item.name, 50)}
              {item.quantity ? ` x${item.quantity}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ReferenceDataAssessSection({
  assessResult,
  assessSummary,
}: {
  assessResult: NormalizedAssessResult;
  assessSummary: string[];
}) {
  return (
    <div className="border-t border-slate-200 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-medium text-slate-600">정밀 AI 검사</div>
        <div className="text-[10px] text-slate-400">
          {formatKo(assessResult.createdAt)}
        </div>
      </div>
      <ul className="list-disc space-y-0.5 pl-4">
        {assessSummary.map((item, idx) => (
          <li key={`assess-${idx}`} className="text-slate-600">
            {clip(item, 120)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReferenceDataQuickSection({
  checkAiResult,
  quickLabels,
}: {
  checkAiResult: NormalizedCheckAiResult;
  quickLabels: string[];
}) {
  return (
    <div className="border-t border-slate-200 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-medium text-slate-600">빠른 AI 검사</div>
        <div className="text-[10px] text-slate-400">
          {formatKo(checkAiResult.createdAt)}
        </div>
      </div>
      <div className="mt-1 text-slate-600">{quickLabels.join(", ")}</div>
    </div>
  );
}

export function ReferenceDataHealthLinkSection({
  healthLink,
  highlights,
}: {
  healthLink: NormalizedHealthLinkSummary;
  highlights: string[];
}) {
  return (
    <div className="border-t border-slate-200 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-medium text-slate-600">건강링크 요약</div>
        <div className="text-[10px] text-slate-400">
          {formatKo(healthLink.fetchedAt)}
        </div>
      </div>
      {healthLink.headline ? (
        <p className="font-medium text-slate-700">{healthLink.headline}</p>
      ) : null}
      {healthLink.summary ? (
        <p className="mt-1 text-slate-600">{clip(healthLink.summary, 120)}</p>
      ) : null}
      {highlights.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {highlights.map((item, idx) => (
            <li key={`health-link-${idx}`} className="text-slate-600">
              {clip(item, 120)}
            </li>
          ))}
        </ul>
      ) : null}
      {healthLink.topMedicines.length > 0 ? (
        <div className="mt-2 text-slate-600">
          복약 이력: {healthLink.topMedicines.map((item) => item.label).join(", ")}
        </div>
      ) : null}
    </div>
  );
}

export function ReferenceDataConsultationImpactSection({
  summary,
  onRunPrompt,
}: {
  summary: UserContextSummary;
  onRunPrompt?: (prompt: string) => void;
}) {
  return (
    <div className="border-t border-slate-200 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-medium text-slate-600">상담 영향 학습</div>
        <div className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          다음 행동 힌트
        </div>
      </div>
      <p className="font-medium text-slate-700">
        {summary.consultationImpact.headline}
      </p>
      <p className="mt-1 text-slate-600">{summary.consultationImpact.insight}</p>
      {summary.consultationImpact.evidence.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {summary.consultationImpact.evidence.map((item, idx) => (
            <li key={`consult-impact-${idx}`} className="text-slate-600">
              {clip(item, 120)}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {summary.consultationImpact.draftPrompt ? (
          <button
            type="button"
            onClick={() => onRunPrompt?.(summary.consultationImpact.draftPrompt)}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-slate-800"
          >
            {summary.consultationImpact.recommendedActionLabel}
          </button>
        ) : null}
        <Link
          href={summary.consultationImpact.recommendedActionHref}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
        >
          관련 화면 보기
        </Link>
      </div>
    </div>
  );
}

export function ReferenceDataValuePropositionSection({
  valueProposition,
  onRunPrompt,
  onSecondaryAction,
}: {
  valueProposition: ReferenceValueProposition;
  onRunPrompt?: (prompt: string) => void;
  onSecondaryAction?: () => void;
}) {
  return (
    <div className="border-t border-slate-200 pt-2">
      <PersonalizedValuePropositionCard
        model={valueProposition}
        compact
        onPrimaryAction={() => onRunPrompt?.(valueProposition.chatPrompt)}
        onSecondaryAction={onSecondaryAction}
      />
    </div>
  );
}

export function ReferenceDataJourneySegmentSection({
  summary,
  onRunPrompt,
}: {
  summary: UserContextSummary;
  onRunPrompt?: (prompt: string) => void;
}) {
  return (
    <div className="border-t border-slate-200 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-medium text-slate-600">지금 읽히는 사용자 흐름</div>
        <div className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
          {summary.journeySegment.label}
        </div>
      </div>
      <p className="font-medium text-slate-700">
        {summary.journeySegment.headline}
      </p>
      <p className="mt-1 text-slate-600">{summary.journeySegment.summary}</p>
      {summary.journeySegment.reasonLines.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {summary.journeySegment.reasonLines.map((item, idx) => (
            <li key={`journey-segment-${idx}`} className="text-slate-600">
              {clip(item, 120)}
            </li>
          ))}
        </ul>
      ) : null}
      {summary.journeySegment.chatPrompt ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRunPrompt?.(summary.journeySegment.chatPrompt)}
            className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-sky-500"
          >
            이 흐름 기준으로 이어서 묻기
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReferenceDataTrustSection({
  summary,
}: {
  summary: UserContextSummary;
}) {
  return (
    <div className="border-t border-slate-200 pt-2">
      <PersonalizedTrustPanel
        summary={summary}
        compact
      />
    </div>
  );
}
