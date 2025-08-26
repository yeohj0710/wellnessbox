import { CategoryKey } from './categories';

export interface Question {
  id: string;
  text: string;
  type: 'choice' | 'number' | 'multi';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
}

export const INTEREST_LABELS: Record<CategoryKey, string> = {
  vitaminC: '피부·항산화',
  omega3: '심혈관·혈액순환',
  calcium: '뼈·치아 건강',
  lutein: '눈 건강',
  vitaminD: '뼈·면역',
  milkThistle: '간 건강',
  probiotics: '장·소화',
  vitaminB: '피로·에너지',
  magnesium: '긴장·근육',
  garcinia: '체중 관리',
  multivitamin: '기초 영양',
  zinc: '면역·피부',
  psyllium: '배변·식이섬유',
  minerals: '미네랄 보충',
  vitaminA: '눈·피부',
  iron: '빈혈 예방',
  phosphatidylserine: '집중·기억',
  folicAcid: '임신 준비',
  arginine: '혈류·운동',
  chondroitin: '관절',
  coenzymeQ10: '피로·항산화',
  collagen: '피부·모발',
};

export const sectionA: Question[] = [
  {
    id: 'A1',
    text: '당신의 성별을 알려주세요.',
    type: 'choice',
    options: [
      { value: 'M', label: '남성' },
      { value: 'F', label: '여성' },
    ],
  },
  {
    id: 'A2',
    text: '만 나이를 알려주세요.',
    type: 'number',
    min: 0,
    max: 120,
  },
  {
    id: 'A3',
    text: '키를 센티미터(cm) 단위로 입력해 주세요.',
    type: 'number',
    min: 50,
    max: 250,
  },
  {
    id: 'A4',
    text: '현재 체중을 킬로그램(kg) 단위로 입력해 주세요.',
    type: 'number',
    min: 20,
    max: 250,
  },
  {
    id: 'A10',
    text: '관심 있는 건강 개선 분야를 선택해 주세요. 1~5개 정도 고르시면 좋아요.',
    type: 'multi',
    options: Object.entries(INTEREST_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    id: 'A5',
    text: '현재 임신 중이거나 수유 중이신가요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'A6',
    text: '항응고제를 복용 중이거나 출혈 장애가 있거나 수술 예정이신가요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'A7',
    text: '신장결석 병력이 있거나 만성 신장질환이 있으신가요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'A8',
    text: '간 질환을 진단받았거나 간 수치가 이상한 적이 있으신가요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'A9',
    text: '철 과잉을 진단받은 적이 있으신가요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'A11',
    text: '일주일에 등푸른 생선을 얼마나 드시나요?',
    type: 'choice',
    options: [
      { value: 0, label: '거의 먹지 않아요' },
      { value: 1, label: '주 1회 정도 먹어요' },
      { value: 2, label: '주 2회 이상 먹어요' },
    ],
  },
  {
    id: 'A12',
    text: '평일에 하루 15분 미만으로만 햇빛을 쬐시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'A13',
    text: '일주일에 유제품은 얼마나 섭취하시나요?',
    type: 'choice',
    options: [
      { value: 'le2', label: '주 2회 이하예요' },
      { value: '3-5', label: '주 3~5회예요' },
      { value: '6+', label: '주 6회 이상이에요' },
    ],
  },
  {
    id: 'A14',
    text: '하루에 화면을 보는 시간은 얼마나 되나요?',
    type: 'choice',
    options: [
      { value: '<4', label: '하루 4시간 미만이에요' },
      { value: '4-5', label: '하루 4~5시간이에요' },
      { value: '6+', label: '하루 6시간 이상이에요' },
    ],
  },
  {
    id: 'A15',
    text: '평소 배변 상태는 어떠신가요?',
    type: 'choice',
    options: [
      { value: 'const', label: '변비가 있어요' },
      { value: 'normal', label: '보통이에요' },
      { value: 'loose', label: '묽거나 배가 더부룩해요' },
    ],
  },
];

export const sectionB: Question[] = [
  {
    id: 'B16',
    text: '지난 2주 동안 피로감을 어느 정도 느끼셨나요?',
    type: 'choice',
    options: [
      { value: 0, label: '전혀 피곤하지 않았어요' },
      { value: 1, label: '조금 피곤했어요' },
      { value: 2, label: '보통이었어요' },
      { value: 3, label: '많이 피곤했어요' },
    ],
  },
  {
    id: 'B17',
    text: '수면의 질이 좋지 않거나 쥐가 자주 나시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B18',
    text: '관절 통증은 얼마나 자주 느끼시나요?',
    type: 'choice',
    options: [
      { value: 'none', label: '관절 통증이 없어요' },
      { value: 'some', label: '가끔 있어요' },
      { value: 'often', label: '자주 있어요' },
    ],
  },
  {
    id: 'B19',
    text: '피부, 모발 또는 손톱과 관련해 고민이 있다면 모두 선택해 주세요.',
    type: 'multi',
    options: [
      { value: 'elastic', label: '피부 탄력이 떨어졌어요' },
      { value: 'dry', label: '피부가 건조해요' },
      { value: 'acne', label: '여드름이나 염증이 있어요' },
      { value: 'slow', label: '상처가 잘 낫지 않아요' },
      { value: 'nail', label: '손톱이 갈라져요' },
      { value: 'hair', label: '모발이 푸석해요' },
    ],
  },
  {
    id: 'B20',
    text: '야식이나 탄수화물 위주의 식사를 자주 하거나 최근 체중이 증가했나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B21',
    text: '평소 음주 빈도는 어느 정도인가요?',
    type: 'choice',
    options: [
      { value: 'none', label: '거의 마시지 않아요' },
      { value: '1-2', label: '주 1~2회 마셔요' },
      { value: '3+', label: '주 3회 이상 또는 폭음해요' },
    ],
  },
  {
    id: 'B22',
    text: '여성의 경우, 월경량이 많거나 빈혈이 의심되시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
      { value: 'na', label: '해당되지 않아요' },
    ],
  },
  {
    id: 'B23',
    text: '혈중 지질 이상을 지적받았거나 심혈관 질환 가족력이 있으신가요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B24',
    text: '집중력이나 기억력이 저하되었다고 느끼시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B25',
    text: '소화가 불편하거나 가스, 더부룩함을 자주 느끼시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B26',
    text: '자주 잔병치레를 하거나 감기에 잘 걸리시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B27',
    text: '운동 수행 능력이나 지구력을 높이고 싶으신가요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B28',
    text: '손발이 차거나 혈액 순환이 잘 되지 않는다고 느끼시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B29',
    text: '식사의 질이 낮거나 끼니를 자주 거르시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B30',
    text: '땀을 많이 흘리는 활동을 하거나 더운 환경에서 근무하시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
  {
    id: 'B31',
    text: '야간 운전 시나 어두운 곳에서 시야가 불편하다고 느끼시나요?',
    type: 'choice',
    options: [
      { value: true, label: '네' },
      { value: false, label: '아니요' },
    ],
  },
];

export const fixedA = ['A1', 'A2', 'A3', 'A4', 'A10'];

export function hashChoice(qid: string, val: any) {
  const str = String(val) + qid;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}
