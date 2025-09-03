"use client";

export default function SuggestedQuestions({ onSelect }: { onSelect: (q: string) => void }) {
  const examples = [
    "수면에 도움되는 영양소는?",
    "스트레스가 심한데 추천은?",
    "운동 회복에 좋은 조합 알려줘",
    "장을 편안하게 돕는 방법은?",
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-4">
      {examples.map((ex, i) => (
        <button
          key={i}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
          onClick={() => onSelect(ex)}
        >
          {ex}
        </button>
      ))}
    </div>
  );
}
