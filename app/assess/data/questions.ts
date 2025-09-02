import { INTEREST_LABELS } from "@/lib/categories";

export interface Question {
  id: string;
  text: string;
  type: "choice" | "number" | "multi";
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
}

export const sectionA: Question[] = [
  {
    id: "A1",
    text: "먼저, 성별을 알려주시겠어요?",
    type: "choice",
    options: [
      { value: "M", label: "남성" },
      { value: "F", label: "여성" },
    ],
  },
  {
    id: "A2",
    text: "만 나이를 알려주세요.",
    type: "number",
    min: 0,
    max: 120,
  },
  {
    id: "A3",
    text: "현재 키(cm)를 입력해주세요.",
    type: "number",
    min: 50,
    max: 250,
  },
  {
    id: "A4",
    text: "현재 체중(kg)을 입력해주세요.",
    type: "number",
    min: 20,
    max: 250,
  },
  {
    id: "A10",
    text: "관심 있는 건강 개선 분야를 모두 선택해 주세요. 1~5개 정도 고르면 좋아요.",
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
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "A6",
    text: "항응고제 복용 중이거나, 출혈 장애가 있거나, 수술 예정이신가요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "A7",
    text: "신장결석 병력이 있거나 만성 신장질환이 있으신가요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "A8",
    text: "간 질환을 진단받았거나, 간 수치에 이상이 있었던 적이 있으신가요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "A9",
    text: "철분 과잉(혈색소증 등) 진단을 받은 적이 있나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "A11",
    text: "등푸른 생선(고등어·연어 등)을 얼마나 자주 드시나요?",
    type: "choice",
    options: [
      { value: 0, label: "거의 먹지 않아요" },
      { value: 1, label: "주 1회 정도 먹어요" },
      { value: 2, label: "주 2회 이상 먹어요" },
    ],
  },
  {
    id: "A12",
    text: "햇빛을 쬐는 시간이 부족하다고 느끼나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "A13",
    text: "우유·치즈와 같은 유제품을 일주일에 몇 번 드시나요?",
    type: "choice",
    options: [
      { value: "le2", label: "주 2회 이하예요" },
      { value: "3-5", label: "주 3~5회예요" },
      { value: "6+", label: "주 6회 이상이에요" },
    ],
  },
  {
    id: "A14",
    text: "하루 화면(스마트폰/PC) 사용 시간은 어느 정도인가요?",
    type: "choice",
    options: [
      { value: "<4", label: "하루 4시간 미만이에요" },
      { value: "4-5", label: "하루 4~5시간이에요" },
      { value: "6+", label: "하루 6시간 이상이에요" },
    ],
  },
  {
    id: "A15",
    text: "평소 배변 상태는 어떠신가요?",
    type: "choice",
    options: [
      { value: "const", label: "변비가 있어요" },
      { value: "normal", label: "보통이에요" },
      { value: "loose", label: "묽거나 설사가 잦아요" },
    ],
  },
];

export const sectionB: Question[] = [
  {
    id: "B16",
    text: "지난 2주 동안 피로감을 어느 정도 느끼셨나요?",
    type: "choice",
    options: [
      { value: 0, label: "전혀 피곤하지 않았어요" },
      { value: 1, label: "조금 피곤했어요" },
      { value: 2, label: "보통이었어요" },
      { value: 3, label: "많이 피곤했어요" },
    ],
  },
  {
    id: "B17",
    text: "수면의 질이 좋지 않거나, 쥐가 자주 나는 편인가요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B18",
    text: "무릎·관절의 통증이나 불편이 있나요?",
    type: "choice",
    options: [
      { value: "none", label: "관절 통증은 없어요" },
      { value: "some", label: "가끔 있어요" },
      { value: "often", label: "자주 있어요" },
    ],
  },
  {
    id: "B19",
    text: "피부, 모발 또는 손톱과 관련해 고민이 있다면 모두 선택해 주세요.",
    type: "multi",
    options: [
      { value: "elastic", label: "피부 탄력이 떨어졌어요" },
      { value: "dry", label: "피부가 건조해요" },
      { value: "acne", label: "여드름이나 염증이 있어요" },
      { value: "slow", label: "상처가 잘 낫지 않아요" },
      { value: "nail", label: "손톱이 갈라져요" },
      { value: "hair", label: "모발이 푸석해요" },
    ],
  },
  {
    id: "B20",
    text: "야식·당류·음료 섭취가 잦거나, 최근 3개월 내 체중 변화가 컸나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B21",
    text: "평소 술을 얼마나 자주 마시시나요?",
    type: "choice",
    options: [
      { value: "none", label: "거의 마시지 않아요" },
      { value: "1-2", label: "주 1~2회 마셔요" },
      { value: "3+", label: "주 3회 이상 또는 폭음해요" },
    ],
  },
  {
    id: "B22",
    text: "월경량이 많거나 빈혈이 의심되시나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
      { value: "na", label: "해당되지 않아요" },
    ],
  },
  {
    id: "B23",
    text: "혈중 지질 이상을 지적받았거나 심혈관 질환 가족력이 있으신가요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B24",
    text: "최근 집중력이나 기억력 저하로 일상에 불편을 겪은 적이 있나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B25",
    text: "소화불량이나 속이 더부룩한 증상이 주 3회 이상 있나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B26",
    text: "감기 등 잔병치레가 잦은 편인가요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B27",
    text: "운동 시 체력이 많이 부족하거나 쉽게 지치나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B28",
    text: "손발이 차갑거나 혈액순환이 잘 안 된다고 느끼시나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B29",
    text: "하루 두 끼 이하로 먹거나, 가공식품 위주의 식사를 자주 하시나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B30",
    text: "땀을 많이 흘리거나, 고온 환경에서 주로 일하시나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
  {
    id: "B31",
    text: "야간 운전이나 어두운 환경에서 시야가 자주 불편하다고 느끼시나요?",
    type: "choice",
    options: [
      { value: true, label: "네" },
      { value: false, label: "아니요" },
    ],
  },
];

export const fixedA = ["A1", "A2", "A3", "A4", "A10"];

export function hashChoice(qid: string, val: any) {
  const str = String(val) + qid;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}
