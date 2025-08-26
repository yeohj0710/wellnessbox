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
    text: "당신의 성별을 선택해 주세요.",
    type: "choice",
    options: [
      { value: "M", label: "남성" },
      { value: "F", label: "여성" },
    ],
  },
  { id: "A2", text: "만 나이는 몇 살인가요?", type: "number" },
  { id: "A3", text: "키는 몇 센티미터인가요?", type: "number" },
  { id: "A4", text: "현재 체중은 몇 킬로그램인가요?", type: "number" },
  {
    id: "A10",
    text: "관심 있는 건강 개선 분야를 선택해 주세요. (1–5개 권장)",
    type: "multi",
    options: Object.entries(INTEREST_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    id: "A5",
    text: "현재 임신 중이거나 수유 중이신가요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A6",
    text: "항응고제를 복용 중이거나 출혈 장애가 있거나 수술 예정이신가요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A7",
    text: "신장결석 병력이 있거나 만성 신장질환이 있으신가요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A8",
    text: "간 질환을 진단받았거나 간 수치가 이상한 적이 있으신가요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A9",
    text: "철 과잉을 진단받은 적이 있으신가요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A11",
    text: "일주일에 등푸른 생선을 얼마나 드시나요?",
    type: "choice",
    options: [
      { value: 0, label: "0" },
      { value: 1, label: "1" },
      { value: 2, label: "2회 이상" },
    ],
  },
  {
    id: "A12",
    text: "평일에 하루 15분 미만으로 햇빛을 쬐시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "A13",
    text: "일주일에 유제품은 얼마나 섭취하시나요?",
    type: "choice",
    options: [
      { value: "le2", label: "≤2" },
      { value: "3-5", label: "3–5" },
      { value: "6+", label: "6+" },
    ],
  },
  {
    id: "A14",
    text: "하루에 화면을 보는 시간은 얼마나 되나요?",
    type: "choice",
    options: [
      { value: "<4", label: "<4h" },
      { value: "4-5", label: "4–5h" },
      { value: "6+", label: "≥6h" },
    ],
  },
  {
    id: "A15",
    text: "평소 배변 상태는 어떠신가요?",
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
    text: "지난 2주 동안 느낀 피로감은 어느 정도였나요? (0–3)",
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
    text: "수면의 질이 좋지 않거나 쥐가 자주 나시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B18",
    text: "관절 통증은 얼마나 자주 느끼시나요?",
    type: "choice",
    options: [
      { value: "none", label: "없음" },
      { value: "some", label: "가끔" },
      { value: "often", label: "자주" },
    ],
  },
  {
    id: "B19",
    text: "피부, 모발 또는 손톱과 관련해 고민이 있다면 모두 선택해 주세요.",
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
    text: "야식이나 탄수화물 위주의 식사를 자주 하거나 최근 체중이 증가했나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B21",
    text: "평소 음주 빈도는 어느 정도인가요?",
    type: "choice",
    options: [
      { value: "none", label: "거의 없음" },
      { value: "1-2", label: "주1–2" },
      { value: "3+", label: "주3+ 또는 폭음" },
    ],
  },
  {
    id: "B22",
    text: "여성의 경우, 월경량이 많거나 빈혈이 의심되시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
      { value: "na", label: "해당 없음" },
    ],
  },
  {
    id: "B23",
    text: "혈중 지질 이상을 지적받았거나 심혈관 질환 가족력이 있으신가요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B24",
    text: "집중력이나 기억력이 저하되었다고 느끼시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B25",
    text: "소화가 불편하거나 가스, 더부룩함을 자주 느끼시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B26",
    text: "자주 잔병치레를 하거나 감기에 잘 걸리시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B27",
    text: "운동 수행 능력이나 지구력을 높이고 싶으신가요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B28",
    text: "손발이 차거나 혈액 순환이 잘 되지 않는다고 느끼시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B29",
    text: "식사의 질이 낮거나 끼니를 자주 거르시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B30",
    text: "땀을 많이 흘리는 활동을 하거나 더운 환경에서 근무하시나요?",
    type: "choice",
    options: [
      { value: true, label: "예" },
      { value: false, label: "아니오" },
    ],
  },
  {
    id: "B31",
    text: "야간 운전 시나 어두운 곳에서 시야가 불편하다고 느끼시나요?",
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
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

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

  const sectionTitle =
    section === "A" ? "건강 프로필" : "생활 습관 및 증상";

  const handleAnswer = (val: any) => {
    setAnswers((prev) => ({ ...prev, [current]: val }));

    let message = "다음 질문을 준비하고 있어요...";
    let action: () => void;

    if (section === "A" && fixedIdx < fixedA.length - 1) {
      const nextId = fixedA[fixedIdx + 1];
      action = () => {
        setFixedIdx(fixedIdx + 1);
        setCurrent(nextId);
      };
    } else {
      const newRemaining = remaining.filter((id) => id !== current);
      if (newRemaining.length === 0) {
        if (section === "A") {
          message = "이제 생활 습관 및 증상에 대한 질문을 할게요...";
          action = () => {
            setSection("B");
            setRemaining(sectionB.map((q) => q.id));
            setCurrent(sectionB[0].id);
            setFixedIdx(0);
          };
        } else {
          message = "결과를 분석하는 중이에요...";
          action = () => {
            setSection("DONE");
          };
        }
      } else {
        const nextId =
          newRemaining[hashChoice(current, val) % newRemaining.length];
        action = () => {
          setRemaining(newRemaining);
          setCurrent(nextId);
        };
      }
    }

    setLoadingText(message);
    setLoading(true);
    setTimeout(() => {
      action();
      setLoading(false);
    }, 700);
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
      <div className="relative mt-6 sm:mt-10 overflow-visible sm:rounded-3xl sm:bg-white/70 sm:ring-1 sm:ring-black/5 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:backdrop-blur">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <svg
              className="h-6 w-6 animate-spin text-sky-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <p className="mt-3 text-gray-700">{loadingText}</p>
          </div>
        )}
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
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition transform hover:bg-gray-50 hover:ring-2 hover:ring-sky-400 hover:scale-105"
                  onClick={() => handleAnswer(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === "number" && (
            <div className="mt-4">
              <NumberInput
                key={currentQuestion.id}
                onSubmit={(v) => handleAnswer(v)}
              />
            </div>
          )}

          {currentQuestion.type === "multi" && (
            <div className="mt-4">
              <MultiSelect
                key={currentQuestion.id}
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
