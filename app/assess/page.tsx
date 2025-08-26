"use client";

import { useState, useMemo } from "react";
import { evaluate, CategoryKey } from "./algorithm";

// 사용자에게 노출할 관심 분야 라벨
const INTEREST_LABELS: Record<CategoryKey, string> = {
  vitaminC: "피부·항산화",
  omega3: "심혈관·혈액순환",
  calcium: "뼈·치아 건강",
  lutein: "눈 건강",
  vitaminD: "뼈·면역",
  milkThistle: "간 건강",
  probiotics: "장·소화",
  vitaminB: "피로·에너지",
  magnesium: "긴장·근육",
  garcinia: "체중 관리",
  multivitamin: "기초 영양",
  zinc: "면역·피부",
  psyllium: "배변·식이섬유",
  minerals: "미네랄 보충",
  vitaminA: "눈·피부",
  iron: "빈혈 예방",
  phosphatidylserine: "집중·기억",
  folicAcid: "임신 준비",
  arginine: "혈류·운동",
  chondroitin: "관절",
  coenzymeQ10: "피로·항산화",
  collagen: "피부·모발",
};

// question definitions
interface Question {
  id: string;
  text: string;
  type: "choice" | "number" | "multi";
  options?: { value: any; label: string }[];
}

const sectionA: Question[] = [
  {
    id: "A1",
    text: "성별",
    type: "choice",
    options: [
      { value: "M", label: "남성" },
      { value: "F", label: "여성" },
    ],
  },
  { id: "A2", text: "나이(만)", type: "number" },
  { id: "A3", text: "키(cm)", type: "number" },
  { id: "A4", text: "체중(kg)", type: "number" },
  {
    id: "A10",
    text: "관심 있는 개선 분야를 선택하세요 (1–5개 권장)",
    type: "multi",
    options: Object.entries(INTEREST_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    id: "A5",
    text: "임신/수유",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A6",
    text: "항응고제 복용·출혈장애·수술 예정",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A7",
    text: "신장결석 병력·만성 신장질환",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A8",
    text: "간질환 진단·간수치 이상",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A9",
    text: "철 과잉 진단",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A11",
    text: "등푸른 생선 섭취(주)",
    type: "choice",
    options: [
      { value: 0, label: "0" },
      { value: 1, label: "1" },
      { value: 2, label: "2회 이상" },
    ],
  },
  {
    id: "A12",
    text: "평일 햇빛 노출 15분 미만",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A13",
    text: "유제품 섭취(주)",
    type: "choice",
    options: [
      { value: "le2", label: "≤2" },
      { value: "3-5", label: "3–5" },
      { value: "6+", label: "6+" },
    ],
  },
  {
    id: "A14",
    text: "화면 시간(일)",
    type: "choice",
    options: [
      { value: "<4", label: "<4h" },
      { value: "4-5", label: "4–5h" },
      { value: "6+", label: "≥6h" },
    ],
  },
  {
    id: "A15",
    text: "배변 상태",
    type: "choice",
    options: [
      { value: "const", label: "변비" },
      { value: "normal", label: "정상" },
      { value: "loose", label: "묽음·팽만" },
    ],
  },
];

const sectionB: Question[] = [
  {
    id: "B16",
    text: "지난 2주 피로감(0–3)",
    type: "choice",
    options: [
      { value: 0, label: "0" },
      { value: 1, label: "1" },
      { value: 2, label: "2" },
      { value: 3, label: "3" },
    ],
  },
  {
    id: "B17",
    text: "수면 질 나쁨 또는 쥐 잦음",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B18",
    text: "관절 통증 빈도",
    type: "choice",
    options: [
      { value: "none", label: "없음" },
      { value: "some", label: "가끔" },
      { value: "often", label: "자주" },
    ],
  },
  {
    id: "B19",
    text: "피부·모발·손톱 고민(복수 선택)",
    type: "multi",
    options: [
      { value: "elastic", label: "피부 탄력 저하" },
      { value: "dry", label: "피부 건조" },
      { value: "acne", label: "여드름·염증" },
      { value: "slow", label: "상처 회복 느림" },
      { value: "nail", label: "손톱 갈라짐" },
      { value: "hair", label: "모발 푸석" },
    ],
  },
  {
    id: "B20",
    text: "야식·탄수 위주·최근 체중 증가",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B21",
    text: "음주 빈도",
    type: "choice",
    options: [
      { value: "none", label: "거의 없음" },
      { value: "1-2", label: "주1–2" },
      { value: "3+", label: "주3+ 또는 폭음" },
    ],
  },
  {
    id: "B22",
    text: "여성: 월경 과다 또는 빈혈 의심",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
      { value: "na", label: "해당 없음" },
    ],
  },
  {
    id: "B23",
    text: "혈중지질 지적 또는 심혈관 가족력",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B24",
    text: "집중·기억 저하",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B25",
    text: "소화 불편·가스·더부룩",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B26",
    text: "잔병치레·감기 잦음",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B27",
    text: "운동 수행·지구력 향상 욕구",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B28",
    text: "수족 냉증·혈류 불량",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B29",
    text: "식사 질 저조 또는 끼니 거름",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B30",
    text: "땀 많은 활동 또는 더운 환경 근무",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B31",
    text: "야간운전·저조도 시야 불편",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
];

function hashChoice(qid: string, val: any) {
  const str = String(val) + qid;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

const fixedA = ["A1", "A2", "A3", "A4", "A10"];

export default function Assess() {
  const [section, setSection] = useState<"A" | "B" | "DONE">("A");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const allQuestions = section === "A" ? sectionA : sectionB;
  const [remaining, setRemaining] = useState<string[]>(
    sectionA.map((q) => q.id).filter((id) => !fixedA.includes(id))
  );
  const [current, setCurrent] = useState<string>(fixedA[0]);
  const [fixedIdx, setFixedIdx] = useState(0);

  const completion = useMemo(() => {
    const total = section === "A" ? sectionA.length : sectionB.length;
    const answered = (
      section === "A"
        ? Object.keys(answers).filter((k) => k.startsWith("A"))
        : Object.keys(answers).filter((k) => k.startsWith("B"))
    ).length;
    return Math.round((answered / total) * 100);
  }, [answers, section]);

  const currentQuestion = allQuestions.find((q) => q.id === current)!;

  const sectionTitle = section === "A" ? "기본 정보" : "생활 습관";

  const handleAnswer = (val: any) => {
    setAnswers((prev) => ({ ...prev, [current]: val }));

    // 고정 질문 순서 처리
    if (section === "A" && fixedIdx < fixedA.length - 1) {
      const nextId = fixedA[fixedIdx + 1];
      setFixedIdx(fixedIdx + 1);
      setCurrent(nextId);
      return;
    }

    const newRemaining = remaining.filter((id) => id !== current);
    if (newRemaining.length === 0) {
      if (section === "A") {
        setSection("B");
        setRemaining(sectionB.map((q) => q.id));
        setCurrent(sectionB[0].id);
        setFixedIdx(0);
      } else {
        setSection("DONE");
      }
      return;
    }

    const nextId = newRemaining[hashChoice(current, val) % newRemaining.length];
    setRemaining(newRemaining);
    setCurrent(nextId);
  };

  if (section === "DONE") {
    const { top } = evaluate(answers);
    return (
      <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
        <div className="relative mt-6 sm:mt-10 overflow-hidden rounded-3xl bg-white/70 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-4">
            추천 카테고리 Top3
          </h1>
          <ul className="space-y-2">
            {top.map((c) => (
              <li
                key={c.key}
                className="p-3 rounded-xl bg-gray-50 flex justify-between"
              >
                <span>{c.label}</span>
                <span className="font-bold">{c.score.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
      <div className="relative mt-6 sm:mt-10 overflow-visible sm:overflow-hidden sm:rounded-3xl sm:bg-white/70 sm:ring-1 sm:ring-black/5 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:backdrop-blur">
        <div className="relative p-4 sm:p-10">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {sectionTitle}
            </h1>
            <div className="min-w-[120px]">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>진행도</span>
                <span className="tabular-nums">{completion}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>

          <h2 className="mt-6 text-xl font-bold text-gray-900">
            {currentQuestion.text}
          </h2>

          {currentQuestion.type === "choice" && (
            <div className="mt-4 space-y-2">
              {currentQuestion.options!.map((opt) => (
                <button
                  key={String(opt.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50 active:scale-[0.99]"
                  onClick={() => handleAnswer(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === "number" && (
            <div className="mt-4">
              <NumberInput onSubmit={(v) => handleAnswer(v)} />
            </div>
          )}

          {currentQuestion.type === "multi" && (
            <div className="mt-4">
              <MultiSelect
                question={currentQuestion}
                onSubmit={(vals) => handleAnswer(vals)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberInput({ onSubmit }: { onSubmit: (val: number) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-3">
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-full rounded-xl border border-gray-200 p-3"
      />
      <button
        onClick={() => onSubmit(Number(val))}
        disabled={val === ""}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white shadow disabled:opacity-60 hover:from-sky-600 hover:to-indigo-600 active:scale-[0.99]"
      >
        다음
      </button>
    </div>
  );
}

function MultiSelect({
  question,
  onSubmit,
}: {
  question: Question;
  onSubmit: (vals: any[]) => void;
}) {
  const [selected, setSelected] = useState<any[]>([]);
  const toggle = (v: any) => {
    setSelected((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
        {question.options!.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              type="button"
              key={String(opt.value)}
              onClick={() => toggle(opt.value)}
              className={[
                "rounded-xl border p-2 text-sm transition whitespace-nowrap",
                active
                  ? "bg-sky-50 ring-2 ring-sky-400"
                  : "border-gray-200 bg-white hover:bg-gray-50",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onSubmit(selected)}
        disabled={selected.length === 0}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white shadow disabled:opacity-60 hover:from-sky-600 hover:to-indigo-600 active:scale-[0.99]"
      >
        다음
      </button>
    </div>
  );
}
