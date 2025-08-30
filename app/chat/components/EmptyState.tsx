"use client";

export default function EmptyState({
  onTryExamples,
}: {
  onTryExamples: (q: string) => void;
}) {
  const examples = [
    "수면에 도움되는 영양소는?",
    "스트레스가 심한데 추천은?",
    "운동 회복에 좋은 조합 알려줘",
    "장을 편안하게 돕는 방법은?",
  ];
  return (
    <div className="text-center text-slate-700 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">맞춤형 영양 상담을 시작해 보세요</h2>
        <p className="text-sm text-slate-500 mt-1">
          검사를 완료하면 더 정확한 상담이 가능해요. 결과가 없어도 바로 상담할 수 있어요!
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((ex, i) => (
          <button
            key={i}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
            onClick={() => onTryExamples(ex)}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
