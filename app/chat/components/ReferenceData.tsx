"use client";

import { useMemo } from "react";

interface OrderItem {
  name: string;
  quantity?: number;
}

interface Order {
  id: string;
  status: string;
  updatedAt: number;
  items: OrderItem[];
}

interface AssessResult {
  createdAt: number;
  summary: string[];
  answers?: { question: string; answer: string }[];
}

interface CheckAiResult {
  createdAt: number;
  labels: string[];
  answers?: { question: string; answer: string }[];
}

interface ReferenceDataProps {
  orders: Order[];
  assessResult: AssessResult | null;
  checkAiResult: CheckAiResult | null;
}

function formatKo(dt: number) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(dt));
  } catch {
    return new Date(dt).toLocaleString("ko-KR");
  }
}

function clip(text: string, max = 60) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function ReferenceData({
  orders,
  assessResult,
  checkAiResult,
}: ReferenceDataProps) {
  const hasOrders = Array.isArray(orders) && orders.length > 0;
  const lastOrder = hasOrders
    ? [...orders].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    : null;
  const hasAssess =
    !!assessResult &&
    Array.isArray(assessResult.summary) &&
    assessResult.summary.length > 0;
  const hasQuick =
    !!checkAiResult &&
    Array.isArray(checkAiResult.labels) &&
    checkAiResult.labels.length > 0;
  const show = hasOrders || hasAssess || hasQuick;

  const orderedOrders = useMemo(
    () =>
      hasOrders
        ? [...orders].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)
        : [],
    [hasOrders, orders]
  );

  const assessSummary = useMemo(
    () => (hasAssess ? assessResult!.summary.slice(0, 5) : []),
    [hasAssess, assessResult]
  );

  const quickLabels = useMemo(
    () => (hasQuick ? checkAiResult!.labels.slice(0, 5) : []),
    [hasQuick, checkAiResult]
  );

  if (!show) return null;

  return (
    <div className="mb-1 pl-2">
      <details className="group text-[11px] text-slate-500">
        <summary className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 group-open:bg-slate-400" />
          참고 데이터
        </summary>
        <div className="mb-2 mt-1 inline-block w-auto max-w-[720px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm space-y-3">
          {hasOrders && lastOrder && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <div className="font-medium text-slate-600">최근 주문</div>
                <div className="text-[10px] text-slate-400">
                  {formatKo(lastOrder.updatedAt)}
                </div>
              </div>
              {lastOrder.items.length > 0 && (
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {lastOrder.items.map((item, idx) => (
                    <li key={idx} className="text-slate-600">
                      {clip(item.name, 50)}
                      {item.quantity ? ` x${item.quantity}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {hasAssess && (
            <div className="pt-2 border-t border-slate-200">
              <div className="mb-1 flex items-center justify-between">
                <div className="font-medium text-slate-600">정밀 AI 검사</div>
                <div className="text-[10px] text-slate-400">
                  {formatKo(assessResult!.createdAt)}
                </div>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {assessSummary.map((s, idx) => (
                  <li key={`assess-${idx}`} className="text-slate-600">
                    {clip(s, 120)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasQuick && (
            <div className="pt-2 border-t border-slate-200">
              <div className="mb-1 flex items-center justify-between">
                <div className="font-medium text-slate-600">빠른 AI 검사</div>
                <div className="text-[10px] text-slate-400">
                  {formatKo(checkAiResult!.createdAt)}
                </div>
              </div>
              <div className="mt-1 text-slate-600">
                {quickLabels.join(", ")}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
