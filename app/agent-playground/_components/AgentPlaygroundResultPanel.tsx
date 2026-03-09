"use client";

import { useState } from "react";

import { PlaygroundRunResult } from "@/lib/agent-playground/types";

import { extractEvaluation } from "../_lib/agent-playground-page-model";

type AgentPlaygroundResultPanelProps = {
  title: string;
  result: PlaygroundRunResult | null;
  active: boolean;
  onActivate: () => void;
};

function EvaluationSummary({
  evaluation,
}: {
  evaluation: ReturnType<typeof extractEvaluation>;
}) {
  if (!evaluation) return null;

  const pass = evaluation.pass ?? false;
  const violations = evaluation.violations ?? [];

  return (
    <div className="mt-2 text-xs">
      <div
        className={`inline-flex items-center rounded-md px-2 py-1 font-semibold ${
          pass ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}
      >
        {pass ? "PASS" : "FAIL"}
      </div>

      {!pass && violations.length > 0 && (
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-gray-700">
          {violations.map((violation, index) => (
            <li key={`${violation}-${index}`}>{violation}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AgentPlaygroundResultPanel({
  title,
  result,
  active,
  onActivate,
}: AgentPlaygroundResultPanelProps) {
  const [showMeta, setShowMeta] = useState(false);
  const evaluation = extractEvaluation(result);
  const pass = evaluation?.pass ?? false;
  const score = evaluation?.score;

  const patternId =
    typeof result?.meta?.["patternId"] === "string"
      ? result.meta["patternId"]
      : null;
  const llmCalls =
    typeof result?.meta?.["llmCalls"] === "number"
      ? result.meta["llmCalls"]
      : null;
  const iterations =
    typeof result?.meta?.["iterations"] === "number"
      ? result.meta["iterations"]
      : null;
  const hardRepairs =
    typeof result?.meta?.["hardRepairs"] === "number"
      ? result.meta["hardRepairs"]
      : null;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          {evaluation && (
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              {pass ? "PASS" : "FAIL"}
              {typeof score === "number" && (
                <span className="ml-1 font-normal">({score})</span>
              )}
            </span>
          )}
        </div>

        {result && (
          <button
            className={`rounded px-2 py-1 text-xs ${
              active ? "bg-indigo-600 text-white" : "bg-gray-100"
            }`}
            onClick={onActivate}
          >
            Trace 보기
          </button>
        )}
      </div>

      <div className="min-h-[120px] whitespace-pre-wrap text-sm text-gray-800">
        {result?.error
          ? `오류: ${result.error}`
          : result?.answer || "아직 실행하지 않았습니다."}
      </div>

      <EvaluationSummary evaluation={evaluation} />

      {result?.meta && (
        <div className="mt-3 space-y-1 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-gray-700">메타데이터</div>
            <button
              className="rounded bg-gray-100 px-2 py-1 text-[11px]"
              onClick={() => setShowMeta((prev) => !prev)}
            >
              {showMeta ? "접기" : "펼치기"}
            </button>
          </div>

          {!showMeta && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 rounded border bg-gray-50 p-2 text-[11px] text-gray-700">
              {patternId && <span>pattern: {patternId}</span>}
              {llmCalls !== null && <span>llmCalls: {llmCalls}</span>}
              {iterations !== null && <span>iterations: {iterations}</span>}
              {hardRepairs !== null && <span>repairs: {hardRepairs}</span>}
            </div>
          )}

          {showMeta && (
            <div className="whitespace-pre-wrap rounded border bg-gray-50 p-2 text-[11px] text-gray-700">
              {JSON.stringify(result.meta, null, 2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
