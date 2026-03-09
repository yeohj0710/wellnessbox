"use client";

import { PlaygroundMode } from "@/lib/agent-playground/types";

import { getRunButtonLabel } from "../_lib/agent-playground-page-model";

type PatternSummary = {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
};

type AgentPlaygroundControlPanelProps = {
  comparisonSummary: string;
  loading: PlaygroundMode | null;
  message: string;
  patternId: string;
  patternSummaries: PatternSummary[];
  pendingDefault: boolean;
  selectedPattern?: PatternSummary;
  serverError: string | null;
  onApplyDefault: () => void;
  onMessageChange: (value: string) => void;
  onPatternChange: (patternId: string) => void;
  onRun: (mode: PlaygroundMode) => void;
};

export function AgentPlaygroundControlPanel({
  comparisonSummary,
  loading,
  message,
  patternId,
  patternSummaries,
  pendingDefault,
  selectedPattern,
  serverError,
  onApplyDefault,
  onMessageChange,
  onPatternChange,
  onRun,
}: AgentPlaygroundControlPanelProps) {
  return (
    <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <div className="grid items-start gap-2 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-gray-700">패턴 선택</label>
          <select
            className="w-full rounded-lg border p-2 text-sm"
            value={patternId}
            onChange={(event) => onPatternChange(event.target.value)}
          >
            {patternSummaries.map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.name}
              </option>
            ))}
          </select>

          <div className="rounded border bg-gray-50 p-2 text-xs leading-relaxed text-gray-700">
            <div className="mb-1 text-[11px] font-semibold text-gray-800">
              패턴 설명
            </div>
            <p className="text-[12px] text-gray-700">{selectedPattern?.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="w-full rounded bg-gray-100 px-3 py-2 text-xs"
            onClick={onApplyDefault}
          >
            기본 프롬프트 불러오기
          </button>

          {pendingDefault && (
            <button
              className="w-full rounded border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700"
              onClick={onApplyDefault}
            >
              새 패턴 기본 프롬프트 적용
            </button>
          )}
        </div>
      </div>

      {pendingDefault && (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-gray-600">
          패턴이 변경됐습니다. 직접 수정한 메시지가 남아 있어 자동 교체를 건너뛰었습니다.
          새 기본 문구를 적용하려면 위 버튼을 눌러 덮어쓰세요.
        </div>
      )}

      <textarea
        className="min-h-[120px] w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
        placeholder="질문을 입력하세요."
      />

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => onRun("llm")}
          disabled={loading !== null}
        >
          {getRunButtonLabel("llm", loading)}
        </button>
        <button
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => onRun("agent")}
          disabled={loading !== null}
        >
          {getRunButtonLabel("agent", loading)}
        </button>
        <button
          className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => onRun("both")}
          disabled={loading !== null}
        >
          {getRunButtonLabel("both", loading)}
        </button>
      </div>

      {serverError && <div className="text-sm text-red-600">서버 오류: {serverError}</div>}

      {comparisonSummary && (
        <div className="rounded border bg-gray-50 p-2 text-xs text-gray-700">
          {comparisonSummary}
        </div>
      )}
    </div>
  );
}
