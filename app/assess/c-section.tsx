"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { hashChoice } from "./questions";

export type CSectionResult = {
  catsOrdered: string[];
  scores: number[];
  percents: number[];
};

type QType = "yesno" | "likert4" | "freq_wk4";

type Q = { prompt: string; type: QType };

function getNextQIdx(cat: string, filled: Record<string, boolean[]>): number {
  const arr = filled[cat] || [];
  for (let i = 0; i < 5; i++) if (!arr[i]) return i;
  return -1;
}

function isStrong(type: QType, val: number): boolean {
  if (type === "yesno") return val === 1;
  if (type === "likert4" || type === "freq_wk4") return val >= 2;
  return false;
}

function pickNextCatDeterministic(
  candidates: string[],
  ctx: { cSeed: number; step: number; cat: string; qIdx: number; val: number; cats: string[] }
): string {
  if (candidates.length <= 1) return candidates[0];
  const h = hashChoice("C_NEXT", JSON.stringify(ctx));
  return candidates[h % candidates.length];
}

const BANK: Record<string, Q[]> = {
  vitc: [
    { prompt: "감기처럼 잔병치레가 잦은 편이신가요?", type: "likert4" },
    { prompt: "상처가 금방 아물지 않는 편인가요?", type: "likert4" },
    { prompt: "평소 과일·채소를 충분히 드시나요?", type: "likert4" },
    { prompt: "흡연 또는 간접흡연에 노출되시나요?", type: "likert4" },
    { prompt: "피로가 오래 가는 편인가요?", type: "likert4" },
  ],
  omega3: [
    {
      prompt: "등푸른 생선(고등어·연어 등)을 얼마나 드시나요?",
      type: "freq_wk4",
    },
    {
      prompt: "혈중 지질/중성지방을 지적받았거나 가족력이 있나요?",
      type: "yesno",
    },
    { prompt: "눈·피부·입이 건조하다고 느끼시나요?", type: "likert4" },
    {
      prompt: "건조한 실내/렌즈 착용 등으로 눈이 뻑뻑한가요?",
      type: "likert4",
    },
    { prompt: "심혈관 건강 개선이 필요하다고 느끼시나요?", type: "likert4" },
  ],
  ca: [
    {
      prompt: "유제품/칼슘 강화 식품 섭취가 부족한 편인가요?",
      type: "likert4",
    },
    { prompt: "골다공증 가족력 또는 우려가 있나요?", type: "yesno" },
    { prompt: "체중부하 운동(걷기/근력)을 자주 하시나요?", type: "likert4" },
    { prompt: "폐경 이후이거나 50세 이상 여성인가요?", type: "yesno" },
    { prompt: "최근 낙상/골절을 경험하셨나요?", type: "yesno" },
  ],
  lutein: [
    { prompt: "야간 운전/야외에서 눈부심이 불편하신가요?", type: "likert4" },
    { prompt: "장시간 화면 사용으로 눈이 쉽게 피로하신가요?", type: "likert4" },
    { prompt: "녹황색 채소 섭취가 부족한 편인가요?", type: "likert4" },
    { prompt: "강한 햇빛/블루라이트에 민감하신가요?", type: "likert4" },
    { prompt: "루테인 보충제를 복용해본 경험이 있나요?", type: "likert4" },
  ],
  vitd: [
    { prompt: "햇빛 노출 시간이 부족하다고 느끼시나요?", type: "likert4" },
    { prompt: "근육/관절 통증이 잦은 편인가요?", type: "likert4" },
    { prompt: "비타민D 수치가 낮다는 소견을 들으셨나요?", type: "yesno" },
    { prompt: "자외선 차단제를 항상 바르시나요?", type: "likert4" },
    { prompt: "실내 활동 시간이 매우 긴 편인가요?", type: "likert4" },
  ],
  milkthistle: [
    { prompt: "음주 빈도/양이 많으신가요?", type: "likert4" },
    { prompt: "지방간/간수치 상승을 지적받은 적이 있나요?", type: "yesno" },
    { prompt: "만성 피로/소화 불편을 느끼시나요?", type: "likert4" },
    { prompt: "간에 부담되는 약물을 복용 중이신가요?", type: "yesno" },
    { prompt: "과로 후 회복이 더딘 편인가요?", type: "likert4" },
  ],
  probiotics: [
    { prompt: "복부 팽만/더부룩함이 잦은가요?", type: "likert4" },
    { prompt: "배변 주기/상태가 불규칙한가요?", type: "likert4" },
    { prompt: "최근 항생제를 복용하셨나요?", type: "yesno" },
    { prompt: "발효식품 섭취가 적은 편인가요?", type: "freq_wk4" },
    { prompt: "복통/과민성 장 증상이 있나요?", type: "likert4" },
  ],
  vitb: [
    { prompt: "피로/무기력/스트레스가 높다고 느끼나요?", type: "likert4" },
    { prompt: "구내염·입술 갈라짐이 잦나요?", type: "likert4" },
    { prompt: "과로로 컨디션 저하가 잦나요?", type: "likert4" },
    { prompt: "음주 빈도가 잦은 편인가요?", type: "likert4" },
    { prompt: "가공식품·정제 곡물 섭취가 잦은가요?", type: "likert4" },
  ],
  mg: [
    { prompt: "근육 경련/쥐가 자주 나나요?", type: "likert4" },
    { prompt: "수면의 질이 떨어진다고 느끼시나요?", type: "likert4" },
    { prompt: "두통/편두통이 잦나요?", type: "likert4" },
    { prompt: "변비가 잦은 편인가요?", type: "likert4" },
    { prompt: "카페인 섭취가 많은 편인가요?", type: "likert4" },
  ],
  garcinia: [
    { prompt: "식욕 조절이 어렵고 과식하는 편인가요?", type: "likert4" },
    { prompt: "단 음식/야식 섭취가 잦나요?", type: "likert4" },
    { prompt: "체중 관리 목표가 뚜렷하신가요?", type: "likert4" },
    { prompt: "체중 관리 보조제 복용에 거부감이 없나요?", type: "yesno" },
    { prompt: "운동을 병행하실 의지가 있나요?", type: "likert4" },
  ],
  multivitamin: [
    {
      prompt: "끼니를 자주 거르거나 식단 균형이 나쁜 편인가요?",
      type: "likert4",
    },
    { prompt: "컨디션 저하/피로가 잦나요?", type: "likert4" },
    { prompt: "채소·과일·통곡물 섭취가 부족한가요?", type: "likert4" },
    { prompt: "수면·운동·식사가 불규칙한 편인가요?", type: "likert4" },
    { prompt: "영양제를 꾸준히 복용할 자신이 있으신가요?", type: "likert4" },
  ],
  zn: [
    { prompt: "감기 등 잔병치레가 잦나요?", type: "likert4" },
    { prompt: "상처가 아물기까지 시간이 오래 걸리나요?", type: "likert4" },
    { prompt: "여드름/피부 트러블이 잦나요?", type: "likert4" },
    { prompt: "모발/손톱이 약하다고 느끼시나요?", type: "likert4" },
    { prompt: "육류 섭취가 적은 편인가요?", type: "likert4" },
  ],
  psyllium: [
    { prompt: "배변이 불규칙하고 변비가 잦나요?", type: "likert4" },
    { prompt: "식이섬유 섭취가 부족한 편인가요?", type: "likert4" },
    { prompt: "물 섭취가 부족하신가요?", type: "likert4" },
    { prompt: "가공식품을 자주 드시나요?", type: "likert4" },
    { prompt: "운동량이 부족한 편인가요?", type: "likert4" },
  ],
  minerals: [
    { prompt: "땀을 많이 흘리거나 더운 환경에서 일하시나요?", type: "likert4" },
    { prompt: "식단 편식/불균형이 있나요?", type: "likert4" },
    { prompt: "입맛이 짠 편이거나 ‘단짠’을 선호하시나요?", type: "likert4" },
    { prompt: "야식/인스턴트 섭취가 잦나요?", type: "likert4" },
    { prompt: "근육 피로가 잦은 편인가요?", type: "likert4" },
  ],
  vita: [
    { prompt: "어두운 곳에서 시야 적응이 잘 안 되나요?", type: "likert4" },
    { prompt: "피부·점막 건조감이 있나요?", type: "likert4" },
    { prompt: "채소/간·달걀 섭취가 적은 편인가요?", type: "likert4" },
    { prompt: "자외선 노출이 많은 편인가요?", type: "likert4" },
    { prompt: "비타민A 보충 경험이 있으신가요?", type: "likert4" },
  ],
  fe: [
    { prompt: "창백/피로/두근거림 등이 잦나요?", type: "likert4" },
    { prompt: "검사에서 빈혈 소견을 들으셨나요?", type: "yesno" },
    { prompt: "생리량이 많은 편인가요?", type: "yesno" },
    { prompt: "붉은 고기 섭취가 적은 편인가요?", type: "likert4" },
    { prompt: "철분 복용 시 위장관 불편감을 느끼시나요?", type: "likert4" },
  ],
  ps: [
    { prompt: "업무/학습에 집중을 오래 유지하기 어렵나요?", type: "likert4" },
    { prompt: "감정 기복/스트레스가 높은 편인가요?", type: "likert4" },
    { prompt: "오후 졸림/무기력이 잦나요?", type: "likert4" },
    { prompt: "수면의 질이 좋지 않은 편인가요?", type: "likert4" },
    { prompt: "최근 기억력이 떨어졌다고 느끼시나요?", type: "likert4" },
  ],
  folate: [
    { prompt: "임신 계획 중이거나 초반 임신이신가요?", type: "yesno" },
    { prompt: "빈혈 또는 MCV 증가 소견이 있나요?", type: "yesno" },
    { prompt: "녹황색 채소/강화 곡물 섭취가 적은가요?", type: "freq_wk4" },
    { prompt: "음주 빈도가 잦은 편인가요?", type: "likert4" },
    {
      prompt: "엽산 흡수에 영향을 줄 수 있는 약물을 복용 중인가요?",
      type: "yesno",
    },
  ],
  arginine: [
    { prompt: "말초혈류 불량/손발저림을 자주 느끼시나요?", type: "likert4" },
    { prompt: "고강도 운동 빈도가 높으신가요?", type: "freq_wk4" },
    { prompt: "혈압/혈관 리스크 관리가 필요하신가요?", type: "likert4" },
    { prompt: "지구력 개선이 필요하신가요?", type: "likert4" },
    { prompt: "아르기닌 섭취 시 소화불편을 느끼시나요?", type: "likert4" },
  ],
  chondroitin: [
    { prompt: "무릎/손가락 관절 통증이 자주 있나요?", type: "likert4" },
    { prompt: "아침에 관절이 뻣뻣한가요?", type: "likert4" },
    { prompt: "계단 오르내리기가 불편하신가요?", type: "likert4" },
    {
      prompt: "글루코사민/콘드로이틴 복용 경험이 있으신가요?",
      type: "likert4",
    },
    { prompt: "운동과 체중 관리를 병행할 계획이 있으신가요?", type: "likert4" },
  ],
  coq10: [
    { prompt: "콜레스테롤약(스타틴)을 복용 중이신가요?", type: "yesno" },
    { prompt: "무기력/피로감이 잦은 편인가요?", type: "likert4" },
    { prompt: "심혈관/에너지 개선이 필요하신가요?", type: "likert4" },
    { prompt: "두통 예방이 필요하신가요?", type: "likert4" },
    { prompt: "고강도 운동 후 회복이 더디다고 느끼시나요?", type: "likert4" },
  ],
  collagen: [
    { prompt: "피부 탄력 저하/주름이 걱정되시나요?", type: "likert4" },
    { prompt: "관절/건 통증이 있으신가요?", type: "likert4" },
    { prompt: "단백질 식품 섭취가 부족한 편인가요?", type: "likert4" },
    { prompt: "야외활동/자외선 노출이 잦은 편인가요?", type: "likert4" },
    { prompt: "비타민C와 함께 복용 가능하시나요?", type: "likert4" },
  ],
};

const OPTIONS = {
  yesno: [
    { value: 0, label: "아니요" },
    { value: 1, label: "예" },
  ],
  likert4: [
    { value: 0, label: "전혀 아니에요" },
    { value: 1, label: "가끔 그래요" },
    { value: 2, label: "자주 그래요" },
    { value: 3, label: "매우 그래요" },
  ],
  freq_wk4: [
    { value: 0, label: "거의 없음" },
    { value: 1, label: "주 1회" },
    { value: 2, label: "주 2회" },
    { value: 3, label: "주 3회 이상" },
  ],
};

export default function CSection({
  cats,
  onSubmit,
  onProgress,
  registerPrev,
  persistKey,
}: {
  cats: string[];
  onSubmit: (res: CSectionResult) => void;
  onProgress?: (step: number, total: number) => void;
  registerPrev?: (fn: () => void) => void;
  persistKey?: string;
}) {
  const total = useMemo(() => cats.length * 5, [cats]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>(
    () =>
      Object.fromEntries(cats.map((c) => [c, Array(5).fill(-1)])) as Record<
        string,
        number[]
      >
  );
  const [filled, setFilled] = useState<Record<string, boolean[]>>(
    () =>
      Object.fromEntries(cats.map((c) => [c, Array(5).fill(false)])) as Record<
        string,
        boolean[]
      >
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const lastProgRef = useRef<{ step: number; total: number } | null>(null);
  const [plan, setPlan] = useState<{ cat: string; qIdx: number }[]>([]);
  const [cSeed, setCSeed] = useState<number>(0);
  const [transitioning, setTransitioning] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    const initAnswers = Object.fromEntries(
      cats.map((c) => [c, Array(5).fill(-1)])
    ) as Record<string, number[]>;
    const initFilled = Object.fromEntries(
      cats.map((c) => [c, Array(5).fill(false)])
    ) as Record<string, boolean[]>;

    let restored = false;
    let nextCSeed = hashChoice("C_SEED", cats.join(","));
    let restoredAnswers = initAnswers;
    let restoredFilled = initFilled;
    let restoredPlan: { cat: string; qIdx: number }[] = [];
    let restoredStep = 0;

    if (typeof window !== "undefined") {
      if (persistKey) {
        try {
          const raw = localStorage.getItem(persistKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const cState = parsed?.cState;
            if (
              cState &&
              Array.isArray(cState.cats) &&
              cState.cats.join(",") === cats.join(",")
            ) {
              restored = true;
              nextCSeed = Number(cState.cSeed ?? nextCSeed) >>> 0;
              restoredAnswers = cState.answers ?? initAnswers;
              restoredFilled = cState.filled ?? initFilled;
              restoredPlan = Array.isArray(cState.plan) ? cState.plan : [];
              restoredStep = Number(cState.step ?? 0) | 0;
            }
          }
        } catch {}
      }
      
    }

    function reconstructPlan(
      ans: Record<string, number[]>,
      fil: Record<string, boolean[]>,
      cseed: number
    ): { plan: { cat: string; qIdx: number }[]; step: number } {
      const res: { cat: string; qIdx: number }[] = [];
      const filledCount = cats.reduce(
        (acc, c) => acc + (fil[c] || []).filter(Boolean).length,
        0
      );
      if (filledCount === 0) {
        const initIdx = cats.length > 0 ? hashChoice("C_INIT", String(cseed)) % cats.length : 0;
        const firstCat = cats[initIdx] || cats[0];
        res.push({ cat: firstCat, qIdx: 0 });
        return { plan: res, step: 0 };
      }
      let currentCat = cats.length > 0 ? cats[hashChoice("C_INIT", String(cseed)) % cats.length] : cats[0];
      let currentQ = getNextQIdx(currentCat, fil);
      if (currentQ === -1) {
        const avail = cats.filter((c) => getNextQIdx(c, fil) !== -1);
        currentCat = avail[0] || cats[0];
        currentQ = getNextQIdx(currentCat, fil) === -1 ? 0 : getNextQIdx(currentCat, fil);
      }
      res.push({ cat: currentCat, qIdx: currentQ });

      let built = 0;
      const maxSteps = cats.length * 5;
      const workAns: Record<string, number[]> = Object.fromEntries(
        cats.map((c) => [c, [...(ans[c] || [])]])
      ) as Record<string, number[]>;
      const workFil: Record<string, boolean[]> = Object.fromEntries(
        cats.map((c) => [c, [...(fil[c] || [])]])
      ) as Record<string, boolean[]>;
      while (built < filledCount && built < maxSteps) {
        const pair = res[res.length - 1];
        const val = workAns[pair.cat]?.[pair.qIdx];
        if (val === undefined || val === -1) break;
        workFil[pair.cat][pair.qIdx] = true;
        built++;

        const qtype = (BANK[pair.cat] || [])[pair.qIdx]?.type as QType;
        const strong = isStrong(qtype, val);

        let ncat = pair.cat;
        if (strong) {
          const nextQ = getNextQIdx(ncat, workFil);
          if (nextQ !== -1) {
            res.push({ cat: ncat, qIdx: nextQ });
            continue;
          }
        }
        const candidates = cats.filter(
          (c) => getNextQIdx(c, workFil) !== -1 && c !== pair.cat
        );
        if (candidates.length === 0) break;
        ncat = pickNextCatDeterministic(candidates, {
          cSeed: cseed,
          step: res.length - 1,
          cat: pair.cat,
          qIdx: pair.qIdx,
          val,
          cats,
        });
        res.push({ cat: ncat, qIdx: getNextQIdx(ncat, workFil) });
      }
      const stp = Math.max(0, Math.min(res.length - 1, filledCount));
      return { plan: res, step: stp };
    }

    const validPlan =
      restoredPlan.length > 0 && restoredStep > 0
        ? restoredPlan
            .slice(0, restoredStep)
            .every((p) => (restoredFilled[p.cat] || [])[p.qIdx])
        : restoredStep === 0;

    let finalPlan: { cat: string; qIdx: number }[] = restoredPlan;
    let finalStep = restoredStep;
    if (!validPlan) {
      const rebuilt = reconstructPlan(restoredAnswers, restoredFilled, nextCSeed);
      finalPlan = rebuilt.plan;
      finalStep = Math.min(rebuilt.step, finalPlan.length - 1);
    }
    if (finalPlan.length === 0) {
      const idx = cats.length > 0 ? hashChoice("C_INIT", String(nextCSeed)) % cats.length : 0;
      const fc = cats[idx] || cats[0];
      finalPlan = [{ cat: fc, qIdx: 0 }];
      finalStep = 0;
    }

    setCSeed(nextCSeed >>> 0);
    setAnswers(restoredAnswers);
    setFilled(restoredFilled);
    setPlan(finalPlan);
    setStep(Math.max(0, Math.min(finalStep, finalPlan.length - 1)));
    initializedRef.current = true;
  }, [cats.join(","), persistKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !persistKey) return;
    try {
      const raw = localStorage.getItem(persistKey);
      const base = raw ? JSON.parse(raw) : {};
      base.cState = { cats, step, answers, filled, plan, cSeed };
      localStorage.setItem(persistKey, JSON.stringify(base));
    } catch {}
  }, [persistKey, cats, step, answers, filled, plan, cSeed]);

  // ensure first plan item exists deterministically (cats + cSeed only)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (cats.length === 0) return;
    if (plan.length === 0) {
      const idx = cats.length > 0 ? (hashChoice("C_INIT", String(cSeed)) % cats.length) : 0;
      setPlan([{ cat: cats[idx], qIdx: 0 }]);
      setStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats.join(","), cSeed, plan.length]);

  const currentPair = plan[step] || null;
  const cat = currentPair?.cat || cats[0];
  const qIdx = currentPair?.qIdx ?? 0;
  const bank = BANK[cat] || [];
  const q = bank[qIdx];
  const canContinue = !!filled[cat]?.[qIdx];

  useEffect(() => {
    if (!onProgress) return;
    const answeredCount = cats.reduce(
      (acc, c) => acc + (filled[c] || []).filter(Boolean).length,
      0
    );
    if (
      lastProgRef.current?.step === answeredCount &&
      lastProgRef.current?.total === total
    )
      return;
    lastProgRef.current = { step: answeredCount, total };
    onProgress(answeredCount, total);
  }, [cats, filled, total, onProgress]);

  useEffect(() => {
    registerPrev?.(() => {
      if (step <= 0 || plan.length === 0) {
        setStep(0);
        return;
      }
      const prev = plan[step - 1];
      if (prev) {
        setFilled((f) => {
          const nf = { ...f } as Record<string, boolean[]>;
          nf[prev.cat] = [...(nf[prev.cat] || Array(5).fill(false))];
          nf[prev.cat][prev.qIdx] = false;
          return nf;
        });
        setAnswers((a) => {
          const na = { ...a } as Record<string, number[]>;
          na[prev.cat] = [...(na[prev.cat] || Array(5).fill(-1))];
          na[prev.cat][prev.qIdx] = -1;
          return na;
        });
        setPlan((p) => p.slice(0, Math.max(0, step - 1)));
      }
      setStep((s) => Math.max(0, s - 1));
    });
  }, [registerPrev, plan, step]);

  const weightFromAnswer = (type: QType, val: number) => {
    if (type === "yesno") return val === 1 ? 2 : 0;
    return val;
  };

  const select = (val: number) => {
    if (transitioning || submitting) return;
    if (!currentPair || !q) return;
    const ccat = currentPair.cat;
    const cq = currentPair.qIdx;
    if (filled[ccat]?.[cq]) return;

    const nextAnswers = { ...answers } as Record<string, number[]>;
    nextAnswers[ccat] = [...(nextAnswers[ccat] || Array(5).fill(-1))];
    nextAnswers[ccat][cq] = val;

    const nextFilled = { ...filled } as Record<string, boolean[]>;
    nextFilled[ccat] = [...(nextFilled[ccat] || Array(5).fill(false))];
    nextFilled[ccat][cq] = true;

    setAnswers(nextAnswers);
    setFilled(nextFilled);

    const answeredCount = cats.reduce(
      (acc, c) => acc + (nextFilled[c] || []).filter(Boolean).length,
      0
    );

    setTransitioning(true);
    setTimeout(() => {
      setTransitioning(false);
      if (answeredCount >= total) {
        submit();
        return;
      }

      const strong = isStrong(q.type as QType, val);

      let nextCat = ccat;
      let nextQIdxLocal = -1;

      if (strong) {
        const nq = getNextQIdx(ccat, nextFilled);
        if (nq !== -1) {
          nextCat = ccat;
          nextQIdxLocal = nq;
        }
      }

      if (nextQIdxLocal === -1) {
        const candidates = cats.filter(
          (c) => getNextQIdx(c, nextFilled) !== -1 && c !== ccat
        );
        if (candidates.length === 0) {
          submit();
          return;
        }
        nextCat = pickNextCatDeterministic(candidates, {
          cSeed,
          step,
          cat: ccat,
          qIdx: cq,
          val,
          cats,
        });
        nextQIdxLocal = getNextQIdx(nextCat, nextFilled);
      }

      if (nextCat === ccat && nextQIdxLocal === cq) {
        const forceNext = getNextQIdx(ccat, nextFilled);
        if (forceNext !== -1) {
          nextCat = ccat;
          nextQIdxLocal = forceNext;
        } else {
          const others = cats.filter(
            (c) => getNextQIdx(c, nextFilled) !== -1 && c !== ccat
          );
          if (others.length > 0) {
            nextCat = pickNextCatDeterministic(others, {
              cSeed,
              step,
              cat: ccat,
              qIdx: cq,
              val,
              cats,
            });
            nextQIdxLocal = getNextQIdx(nextCat, nextFilled);
          }
        }
      }

      setPlan((p) => {
        const upto = step + 1;
        const truncated = p.slice(0, upto);
        truncated[upto] = { cat: nextCat, qIdx: nextQIdxLocal };
        setStep(upto);
        return truncated;
      });
    }, 800);
  };

  const submit = async () => {
    if (submitting) return;
    setError("");
    for (const c of cats) {
      const arr = answers[c] || [];
      if (arr.length < 5) {
        const badIdx = arr.length;
        setPlan((p) => {
          const t = p.slice(0, step);
          t[step] = { cat: c, qIdx: badIdx };
          return t;
        });
        setStep((s) => s);
        setError("답변 값이 범위를 벗어났어요");
        return;
      }
      for (let i = 0; i < 5; i++) {
        const v = arr[i];
        const qt = (BANK[c] || [])[i]?.type as QType;
        const ok = qt === "yesno" ? v === 0 || v === 1 : v >= 0 && v <= 3;
        if (v === -1 || !ok) {
          setPlan((p) => {
            const t = p.slice(0, step);
            t[step] = { cat: c, qIdx: i };
            return t;
          });
          setStep((s) => s);
          setError("답변 값이 범위를 벗어났어요");
          return;
        }
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = { cats, answers: cats.map((c) => answers[c]) };
      const res = await fetch("/api/c-section-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "서버와 통신 중 오류가 발생했어요.");
      }
      const data = (await res.json()) as CSectionResult;
      onSubmit(data);
    } catch (e: any) {
      setError(e.message || "네트워크 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {false && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm sm:rounded-3xl">
          <div className="w-full max-w-xs mx-auto rounded-2xl p-6 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 bg-white">
            <div className="flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-transparent animate-spin" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-gray-900">다음 문항 준비 중이에요</p>
            <div className="mt-2 flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 opacity-40 animate-[dot_1.2s_ease-in-out_infinite]" />
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 opacity-40 animate-[dot_1.2s_ease-in-out_infinite] [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 opacity-40 animate-[dot_1.2s_ease-in-out_infinite] [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      )}
      {submitting && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm sm:rounded-3xl">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "0ms" }} />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "120ms" }} />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "240ms" }} />
          </div>
          <p className="mt-4 px-4 text-center text-slate-700 font-medium">결과 계산 중</p>
          <style jsx>{`
            .dot { animation: dot 1.2s ease-in-out infinite; will-change: opacity, transform; }
            @keyframes dot {
              0%, 20% { opacity: 0.35; transform: scale(0.92); }
              50% { opacity: 1; transform: scale(1); }
              80%, 100% { opacity: 0.35; transform: scale(0.92); }
            }
          `}</style>
        </div>
      )}
      {transitioning && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm sm:rounded-3xl">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "0ms" }} />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "120ms" }} />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "240ms" }} />
          </div>
          <p className="mt-4 px-4 text-center text-slate-700 font-medium">다음 문항 준비 중</p>
          <style jsx>{`
            .dot { animation: dot 1.2s ease-in-out infinite; will-change: opacity, transform; }
            @keyframes dot {
              0%, 20% { opacity: 0.35; transform: scale(0.92); }
              50% { opacity: 1; transform: scale(1); }
              80%, 100% { opacity: 0.35; transform: scale(0.92); }
            }
          `}</style>
        </div>
      )}
      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-full max-w-xs mx-auto rounded-2xl p-6 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 bg-white">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-transparent animate-spin" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-gray-900">
              맞춤 결과를 계산 중이에요
            </p>
            <p className="mt-1 text-center text-xs text-gray-500">
              답변을 분석해 상위 카테고리와 적합도를 산출하고 있어요
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 animate-[loading_1.2s_ease-in-out_infinite]" />
            </div>
            <div className="mt-2 flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 opacity-40 animate-[dot_1.2s_ease-in-out_infinite]" />
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 opacity-40 animate-[dot_1.2s_ease-in-out_infinite] [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 opacity-40 animate-[dot_1.2s_ease-in-out_infinite] [animation-delay:240ms]" />
            </div>
            <style jsx>{`
              @keyframes loading {
                0% {
                  transform: translateX(-100%);
                  width: 30%;
                }
                50% {
                  transform: translateX(50%);
                  width: 60%;
                }
                100% {
                  transform: translateX(200%);
                  width: 30%;
                }
              }
              @keyframes dot {
                0%,
                20% {
                  opacity: 0.35;
                  transform: scale(0.92);
                }
                50% {
                  opacity: 1;
                  transform: scale(1);
                }
                80%,
                100% {
                  opacity: 0.35;
                  transform: scale(0.92);
                }
              }
            `}</style>
          </div>
        </div>
      )}

      <h2 className="mt-6 text-xl font-bold text-gray-900">{q?.prompt}</h2>
      <div
        className={[
          "mt-6 grid gap-2",
          (OPTIONS[q?.type as QType] || []).length === 1
            ? "grid-cols-1"
            : (OPTIONS[q?.type as QType] || []).length === 2
            ? "grid-cols-2 sm:grid-cols-2"
            : (OPTIONS[q?.type as QType] || []).length === 3
            ? "grid-cols-2 sm:grid-cols-3"
            : (OPTIONS[q?.type as QType] || []).length === 4
            ? "grid-cols-2 sm:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3",
        ].join(" ")}
      >
        {(OPTIONS[q?.type as QType] || []).map((opt) => {
          const active = !!filled[cat]?.[qIdx] && answers[cat]?.[qIdx] === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                select(opt.value);
              }}
              className={[
                "rounded-xl border p-3 text-sm transition-colors flex items-center justify-center text-center whitespace-normal leading-tight min-h-[44px]",
                (transitioning || submitting)
                  ? "border-gray-200 bg-white opacity-60 pointer-events-none"
                  : active
                  ? "border-sky-300 bg-sky-50 ring-2 ring-sky-400"
                  : "border-gray-200 bg-white hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-[0.98]",
              ].join(" ")}
              disabled={transitioning || submitting}
              aria-disabled={transitioning || submitting}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <p className="mt-8 text-xs leading-none text-gray-400">
        중간에 나가도 진행 상황이 저장돼요.
      </p>
    </div>
  );
}



