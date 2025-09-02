"use client";

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

export default function ReferenceData({
  orders,
  assessResult,
  checkAiResult,
}: ReferenceDataProps) {
  if (!orders.length && !assessResult && !checkAiResult) return null;
  return (
    <div className="mt-1 pl-2">
      <details className="group text-[11px] text-slate-500">
        <summary className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 group-open:bg-slate-400" />
          참고 데이터
        </summary>
        <div className="mt-1 inline-block w-auto max-w-[680px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm space-y-2">
          {orders.length > 0 && (
            <div>
              <div className="mb-1 font-medium text-slate-600">주문</div>
              <ul className="space-y-1">
                {orders.map((o) => (
                  <li key={o.id} className="text-slate-600">
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(o.updatedAt).toLocaleString()}
                    </div>
                    {o.items.length > 0 && (
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {o.items.map((item, idx) => (
                          <li key={idx} className="text-slate-600">
                            {item.name}
                            {item.quantity ? ` x${item.quantity}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {assessResult && (
            <div>
              <div className="mb-1 font-medium text-slate-600">정밀 AI 검사</div>
              <div className="text-[10px] text-slate-400">
                {new Date(assessResult.createdAt).toLocaleString()}
              </div>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {assessResult.summary.map((s, idx) => (
                  <li key={idx} className="text-slate-600">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {checkAiResult && (
            <div>
              <div className="mb-1 font-medium text-slate-600">빠른 AI 검사</div>
              <div className="text-[10px] text-slate-400">
                {new Date(checkAiResult.createdAt).toLocaleString()}
              </div>
              <div className="mt-1 text-slate-600">
                {checkAiResult.labels.join(", ")}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
