"use client";

import { TraceEvent } from "@/lib/agent-playground/types";

import { toTracePreview } from "../_lib/agent-playground-page-model";

type AgentPlaygroundTraceCardProps = {
  event: TraceEvent;
  index: number;
  expanded: boolean;
  onToggle: (index: number) => void;
};

export function AgentPlaygroundTraceCard({
  event,
  index,
  expanded,
  onToggle,
}: AgentPlaygroundTraceCardProps) {
  const isStep = event.type === "STEP";

  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 shadow-sm transition ${
        isStep ? "border-indigo-100 bg-indigo-50" : "bg-white hover:shadow"
      }`}
      onClick={() => onToggle(index)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
              isStep
                ? "bg-indigo-100 text-indigo-700"
                : event.type === "ERROR"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {event.type}
          </span>
        </div>
        <div className="text-xs text-gray-500">{event.ms}ms</div>
      </div>

      <div className="mt-1 text-sm text-gray-700">
        {event.name && (
          <span className="mr-2 text-indigo-600">[{event.name}]</span>
        )}
        {toTracePreview(event.outputPreview || event.inputPreview)}
      </div>

      {expanded && (
        <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  );
}
