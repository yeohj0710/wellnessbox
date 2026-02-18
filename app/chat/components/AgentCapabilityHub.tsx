"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { ChatActionType } from "@/lib/chat/agent-actions";

type CapabilityCategory =
  | "cart"
  | "assessment"
  | "account"
  | "navigation"
  | "page"
  | "support"
  | "operations";

type CapabilityAction = {
  id: string;
  type: ChatActionType;
  label: string;
  prompt: string;
  category: CapabilityCategory;
  description?: string;
};

const DISMISS_KEY = "wb_chat_agent_capability_hub_dismissed_v1";

const CATEGORY_LABELS: Record<CapabilityCategory | "all", string> = {
  all: "전체",
  cart: "장바구니/주문",
  assessment: "검사",
  account: "내 정보",
  navigation: "이동",
  page: "현재 페이지",
  support: "문의/정책",
  operations: "운영",
};

export default function AgentCapabilityHub(props: {
  actions: CapabilityAction[];
  visible?: boolean;
  disabled?: boolean;
  onRunPrompt?: (prompt: string) => void;
  onRunAction?: (type: ChatActionType) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<CapabilityCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {}
  }, []);

  const availableCategories = useMemo(() => {
    const fromActions = Array.from(new Set(props.actions.map((item) => item.category)));
    return ["all", ...fromActions] as Array<CapabilityCategory | "all">;
  }, [props.actions]);

  const filteredActions = useMemo(() => {
    if (category === "all") return props.actions;
    return props.actions.filter((item) => item.category === category);
  }, [category, props.actions]);

  useEffect(() => {
    if (!filteredActions.length) {
      setSelectedId("");
      return;
    }
    if (filteredActions.some((item) => item.id === selectedId)) return;
    setSelectedId(filteredActions[0].id);
  }, [filteredActions, selectedId]);

  const selectedAction =
    filteredActions.find((item) => item.id === selectedId) || filteredActions[0] || null;

  if (!props.visible || dismissed || props.actions.length === 0) {
    return null;
  }

  const runAction = (item: CapabilityAction) => {
    if (props.disabled) return;
    if (props.onRunAction) {
      props.onRunAction(item.type);
      return;
    }
    props.onRunPrompt?.(item.prompt);
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const quickActions = filteredActions.slice(0, expanded ? 12 : 6);

  return (
    <div className="mx-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Agent Hub
          </p>
          <p className="mt-0.5 text-[12px] text-slate-700">
            페이지 이동, 검사, 주문, 문의를 채팅으로 바로 실행할 수 있어요.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100"
            aria-label={expanded ? "기능 목록 접기" : "기능 목록 펼치기"}
          >
            {expanded ? (
              <ChevronUpIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100"
            aria-label="허브 닫기"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {availableCategories.map((item) => (
          <button
            key={item}
            type="button"
            disabled={props.disabled}
            onClick={() => setCategory(item)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              category === item
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            } disabled:opacity-50`}
          >
            {CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {quickActions.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={props.disabled}
            onClick={() => {
              setSelectedId(item.id);
              runAction(item);
            }}
            className={`max-w-[13rem] truncate rounded-full border px-3 py-1 text-[11px] ${
              selectedAction?.id === item.id
                ? "border-slate-300 bg-slate-900 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            } disabled:opacity-50`}
            title={item.description || item.prompt}
          >
            {item.label}
          </button>
        ))}
      </div>

      {selectedAction && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-slate-700">추천 명령</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-600">{selectedAction.prompt}</p>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={props.disabled}
              onClick={() => props.onRunPrompt?.(selectedAction.prompt)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              문장으로 실행
            </button>
            <button
              type="button"
              disabled={props.disabled}
              onClick={() => runAction(selectedAction)}
              className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              즉시 실행
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
