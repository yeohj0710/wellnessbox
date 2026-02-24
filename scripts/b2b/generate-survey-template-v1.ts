import fs from "fs";
import path from "path";

type Option = {
  value: string;
  label: string;
  score?: number;
};

type Question = {
  key: string;
  index: number;
  text: string;
  type: "text" | "single" | "multi";
  required: boolean;
  helpText?: string;
  placeholder?: string;
  maxSelect?: number;
  options?: Option[];
};

type SectionMeta = {
  key: string;
  title: string;
  questionCount: number;
};

const COMMON_LIKERT: Option[] = [
  { value: "none", label: "전혀 없음", score: 1 },
  { value: "mild", label: "가끔 있음", score: 0.75 },
  { value: "moderate", label: "보통", score: 0.5 },
  { value: "frequent", label: "자주 있음", score: 0.25 },
  { value: "severe", label: "매우 심함", score: 0 },
];

const COMMON_1_TO_5: Option[] = [
  { value: "very_good", label: "매우 좋음", score: 1 },
  { value: "good", label: "좋은 편", score: 0.75 },
  { value: "normal", label: "보통", score: 0.5 },
  { value: "poor", label: "나쁜 편", score: 0.25 },
  { value: "very_poor", label: "매우 나쁨", score: 0 },
];

const SECTION_META: SectionMeta[] = [
  { key: "S01", title: "기억력 및 인지 기능", questionCount: 10 },
  { key: "S02", title: "수면, 피로", questionCount: 13 },
  { key: "S03", title: "스트레스", questionCount: 7 },
  { key: "S04", title: "구강·치아", questionCount: 11 },
  { key: "S05", title: "눈", questionCount: 12 },
  { key: "S06", title: "피부", questionCount: 7 },
  { key: "S07", title: "간", questionCount: 10 },
  { key: "S08", title: "위", questionCount: 11 },
  { key: "S09", title: "장", questionCount: 9 },
  { key: "S10", title: "체지방", questionCount: 10 },
  { key: "S11", title: "혈당", questionCount: 6 },
  { key: "S12", title: "갱년기 여성", questionCount: 9 },
  { key: "S13", title: "갱년기 남성", questionCount: 8 },
  { key: "S14", title: "월경전 증후군", questionCount: 8 },
  { key: "S15", title: "콜레스테롤·중성지방", questionCount: 15 },
  { key: "S16", title: "혈압", questionCount: 8 },
  { key: "S17", title: "면역력", questionCount: 7 },
  { key: "S18", title: "항산화", questionCount: 7 },
  { key: "S19", title: "관절·뼈", questionCount: 11 },
  { key: "S20", title: "근육", questionCount: 11 },
  { key: "S21", title: "전립선", questionCount: 7 },
  { key: "S22", title: "방광", questionCount: 6 },
  { key: "S23", title: "요로", questionCount: 5 },
  { key: "S24", title: "호흡기", questionCount: 7 },
];

const commonQuestions: Question[] = [
  {
    key: "C01",
    index: 1,
    text: "성별을 선택해 주세요.",
    type: "single",
    required: true,
    options: [
      { value: "female", label: "여성" },
      { value: "male", label: "남성" },
      { value: "other", label: "기타/무응답" },
    ],
  },
  {
    key: "C02",
    index: 2,
    text: "연령대를 선택해 주세요.",
    type: "single",
    required: true,
    options: [
      { value: "20s", label: "20대" },
      { value: "30s", label: "30대" },
      { value: "40s", label: "40대" },
      { value: "50s", label: "50대" },
      { value: "60plus", label: "60대 이상" },
    ],
  },
  {
    key: "C03",
    index: 3,
    text: "신장(cm)을 입력해 주세요.",
    type: "text",
    required: true,
    placeholder: "예: 170",
  },
  {
    key: "C04",
    index: 4,
    text: "체중(kg)을 입력해 주세요.",
    type: "text",
    required: true,
    placeholder: "예: 68",
  },
  {
    key: "C05",
    index: 5,
    text: "현재 복용 중인 의약품/건강기능식품을 입력해 주세요.",
    type: "text",
    required: false,
    placeholder: "없으면 '없음'으로 입력",
  },
  {
    key: "C06",
    index: 6,
    text: "최근 1개월 전반적인 컨디션은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C07",
    index: 7,
    text: "최근 1개월 수면의 질은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C08",
    index: 8,
    text: "최근 1개월 피로 회복 속도는 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C09",
    index: 9,
    text: "최근 1개월 스트레스 관리 상태는 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C10",
    index: 10,
    text: "최근 1개월 집중력 유지 상태는 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C11",
    index: 11,
    text: "흡연 여부를 선택해 주세요.",
    type: "single",
    required: true,
    options: [
      { value: "none", label: "비흡연", score: 1 },
      { value: "former", label: "과거 흡연", score: 0.75 },
      { value: "sometimes", label: "가끔 흡연", score: 0.5 },
      { value: "daily", label: "매일 흡연", score: 0.25 },
      { value: "heavy", label: "하루 1갑 이상", score: 0 },
    ],
  },
  {
    key: "C12",
    index: 12,
    text: "음주 빈도를 선택해 주세요.",
    type: "single",
    required: true,
    options: [
      { value: "none", label: "음주 안 함", score: 1 },
      { value: "monthly", label: "월 1~2회", score: 0.75 },
      { value: "weekly", label: "주 1~2회", score: 0.5 },
      { value: "often", label: "주 3회 이상", score: 0.25 },
      { value: "daily", label: "거의 매일", score: 0 },
    ],
  },
  {
    key: "C13",
    index: 13,
    text: "최근 1개월 운동 빈도는 어떠셨나요?",
    type: "single",
    required: true,
    options: [
      { value: "very_regular", label: "주 5회 이상", score: 1 },
      { value: "regular", label: "주 3~4회", score: 0.75 },
      { value: "normal", label: "주 1~2회", score: 0.5 },
      { value: "rare", label: "월 1~3회", score: 0.25 },
      { value: "none", label: "거의 안 함", score: 0 },
    ],
  },
  {
    key: "C14",
    index: 14,
    text: "최근 1개월 아침 식사 규칙성은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C15",
    index: 15,
    text: "최근 1개월 수분 섭취 상태는 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C16",
    index: 16,
    text: "최근 1개월 업무 집중 지속시간은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C17",
    index: 17,
    text: "최근 1개월 소화 상태는 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C18",
    index: 18,
    text: "최근 1개월 배변 규칙성은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C19",
    index: 19,
    text: "최근 1개월 관절/근육 불편감은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_LIKERT,
  },
  {
    key: "C20",
    index: 20,
    text: "최근 1개월 피부/눈 건조감은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_LIKERT,
  },
  {
    key: "C21",
    index: 21,
    text: "최근 1개월 감기/염증 등 면역 관련 증상은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_LIKERT,
  },
  {
    key: "C22",
    index: 22,
    text: "최근 1개월 혈압/혈당 관련 자각증상은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_LIKERT,
  },
  {
    key: "C23",
    index: 23,
    text: "최근 1개월 체중·체지방 관리 상태는 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_1_TO_5,
  },
  {
    key: "C24",
    index: 24,
    text: "최근 1개월 월경/갱년기 관련 불편감은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_LIKERT,
  },
  {
    key: "C25",
    index: 25,
    text: "최근 1개월 비뇨기/전립선 관련 불편감은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_LIKERT,
  },
  {
    key: "C26",
    index: 26,
    text: "최근 1개월 호흡기 관련 불편감은 어떠셨나요?",
    type: "single",
    required: true,
    options: COMMON_LIKERT,
  },
  {
    key: "C27",
    index: 27,
    text: "현재 개선하고 싶거나 불편한 증상(최대 5개)을 선택해 주세요.",
    helpText:
      "선택한 항목에 해당하는 상세 섹션(S01~S24)만 추가 작성합니다.",
    type: "multi",
    required: true,
    maxSelect: 5,
    options: SECTION_META.map((section) => ({
      value: section.key,
      label: `${section.key} ${section.title}`,
    })),
  },
];

const sectionCatalog = SECTION_META.map((section) => ({
  key: section.key,
  title: section.title,
  displayName: `${section.key} ${section.title}`,
  description: `${section.title} 관련 상세 문항`,
  triggerLabel: section.title,
  questionCount: section.questionCount,
}));

const sectionQuestionBank = [
  "최근 4주 동안 증상이 일상생활에 영향을 준 적이 있나요?",
  "최근 4주 동안 증상이 업무 집중을 방해한 적이 있나요?",
  "최근 4주 동안 증상 때문에 수면의 질이 떨어진 적이 있나요?",
  "최근 4주 동안 증상이 반복되거나 악화된 느낌이 있었나요?",
  "최근 4주 동안 증상 완화를 위해 별도 조치를 한 적이 있나요?",
  "최근 4주 동안 증상으로 인해 식사/활동 패턴이 바뀐 적이 있나요?",
  "최근 4주 동안 주변에서 건강 상태를 걱정한 적이 있나요?",
  "최근 4주 동안 병원/약국 상담 필요성을 느낀 적이 있나요?",
  "최근 4주 동안 증상 강도가 증가했다고 느낀 적이 있나요?",
  "최근 4주 동안 증상으로 인해 기분 저하가 있었나요?",
  "최근 4주 동안 증상 때문에 약 복용 시간을 놓친 적이 있나요?",
  "최근 4주 동안 증상이 반복되어 불안감을 느낀 적이 있나요?",
  "최근 4주 동안 증상으로 인해 업무 성과가 저하된 적이 있나요?",
  "최근 4주 동안 증상과 연관된 생활습관 요인을 체감한 적이 있나요?",
  "최근 4주 동안 증상 관리를 위한 목표를 지키기 어려웠나요?",
];

const sections = SECTION_META.map((section) => ({
  key: section.key,
  title: section.title,
  displayName: `${section.key} ${section.title}`,
  description: `${section.title} 관련 상세 문항`,
  questions: Array.from({ length: section.questionCount }, (_, index) => {
    const prompt = sectionQuestionBank[index % sectionQuestionBank.length];
    return {
      key: `${section.key}_Q${String(index + 1).padStart(2, "0")}`,
      index: index + 1,
      text: `[${section.title}] ${prompt}`,
      type: "single" as const,
      required: true,
      options: COMMON_LIKERT,
    };
  }),
}));

const payload = {
  version: 1,
  title: "웰니스박스 임직원 건강 설문 v1",
  description:
    "공통 1~27 문항과 Q27 선택 섹션(S01~S24) 상세 문항으로 구성된 운영용 설문 템플릿입니다.",
  common: commonQuestions,
  sectionCatalog,
  sections,
  rules: {
    selectSectionByCommonQuestionKey: "C27",
    maxSelectedSections: 5,
    minSelectedSections: 0,
  },
};

const outPath = path.join(process.cwd(), "data", "b2b", "survey-template.v1.json");
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`[b2b] generated survey template: ${outPath}`);
