import type { QType } from "../logic/algorithm";

export type CBank = Record<string, { prompt: string; type: QType }[]>;

export const BANK: CBank = {
  vitc: [
    { prompt: "환절기마다 코·목이 금방 불편해지나요?", type: "likert4" },
    { prompt: "작은 상처가 생각보다 늦게 아물나요?", type: "likert4" },
    {
      prompt: "신선한 과일·채소를 매일 충분히 드시지 못하나요?",
      type: "likert4",
    },
    {
      prompt: "흡연을 하시거나 간접흡연에 자주 노출되시나요?",
      type: "likert4",
    },
    { prompt: "하루 피로가 오래 가는 편인가요?", type: "likert4" },
  ],

  omega3: [
    {
      prompt:
        "지난 1주 동안 생선이 주 재료인 식사를 몇 번 하셨나요?(회·초밥·구이·통조림 포함)",
      type: "freq_wk4",
    },
    {
      prompt: "검진에서 중성지방·콜레스테롤 관리가 필요하다는 말을 들으셨나요?",
      type: "yesno",
    },
    {
      prompt: "피부·입안·눈이 건조하다고 느끼는 날이 잦나요?",
      type: "likert4",
    },
    {
      prompt: "렌즈 착용이나 건조한 실내에서 눈이 쉽게 뻑뻑해지나요?",
      type: "likert4",
    },
    {
      prompt: "혈액순환을 더 도와줄 관리가 필요하다고 느끼시나요?",
      type: "likert4",
    },
  ],

  ca: [
    {
      prompt: "우유·치즈 등 칼슘 강화 식품 섭취가 부족하다고 느끼시나요?",
      type: "likert4",
    },
    { prompt: "골감소·골다공증 관련 가족력이 있으신가요?", type: "yesno" },
    {
      prompt:
        "지난 1주 동안 걷기·계단·근력처럼 체중부하 운동을 몇 번 하셨나요?",
      type: "freq_wk4",
    },
    { prompt: "폐경 이후이거나 50세 이상 여성에 해당하시나요?", type: "yesno" },
    { prompt: "최근 낙상이나 골절을 겪으셨나요?", type: "yesno" },
  ],

  lutein: [
    {
      prompt: "야간이나 역광 상황에서 시야가 불편하다고 느끼시나요?",
      type: "likert4",
    },
    {
      prompt: "오랜 시간 화면을 보면 눈이 쉽게 피로해지나요?",
      type: "likert4",
    },
    {
      prompt: "시금치·케일 같은 녹황색 채소를 자주 드시지 못하나요?",
      type: "likert4",
    },
    { prompt: "강한 햇빛이나 블루라이트에 민감하신가요?", type: "likert4" },
    {
      prompt: "실내가 건조하면 눈이 금방 시리고 뻑뻑해지나요?",
      type: "likert4",
    },
  ],

  vitd: [
    {
      prompt: "최근 한 달간 햇빛을 충분히 쬔다고 느끼기 어렵나요?",
      type: "likert4",
    },
    { prompt: "근육이나 관절이 뻣뻣하거나 자주 뭉치나요?", type: "likert4" },
    {
      prompt: "최근 혈액검사에서 관련 지표가 낮다는 설명을 들으셨나요?",
      type: "yesno",
    },
    {
      prompt: "야외 활동 시 자외선 차단제를 꼼꼼히 바르시는 편인가요?",
      type: "likert4",
    },
    { prompt: "하루 대부분을 실내에서 보내시나요?", type: "likert4" },
  ],

  milkthistle: [
    { prompt: "음주 빈도나 양을 줄이기 어렵다고 느끼시나요?", type: "likert4" },
    {
      prompt: "검진에서 간 수치와 관련해 지적을 받은 적이 있으신가요?",
      type: "yesno",
    },
    { prompt: "식후 더부룩함이 오래가는 날이 종종 있나요?", type: "likert4" },
    {
      prompt: "간에 부담이 될 수 있는 약을 장기간 복용 중이신가요?",
      type: "yesno",
    },
    { prompt: "과로 후 회복이 더딘 편인가요?", type: "likert4" },
  ],

  probiotics: [
    { prompt: "복부 팽만감이나 더부룩함을 자주 느끼시나요?", type: "likert4" },
    { prompt: "배변 주기나 상태가 들쭉날쭉한 편인가요?", type: "likert4" },
    { prompt: "최근 항생제를 복용하신 적이 있나요?", type: "yesno" },
    {
      prompt: "지난 1주 동안 김치·요거트·청국장 등 발효식품을 몇 번 드셨나요?",
      type: "freq_wk4",
    },
    {
      prompt: "복통이나 과민성 장 증상으로 불편할 때가 있나요?",
      type: "likert4",
    },
  ],

  vitb: [
    { prompt: "스트레스나 무기력감을 자주 느끼시나요?", type: "likert4" },
    { prompt: "입안이 잘 헐거나 입술이 자주 갈라지나요?", type: "likert4" },
    { prompt: "과로 후 컨디션 난조가 잦은 편인가요?", type: "likert4" },
    { prompt: "음주가 있는 날이 꽤 있나요?", type: "likert4" },
    { prompt: "가공식품·정제곡물 위주로 식사할 때가 많나요?", type: "likert4" },
  ],

  mg: [
    { prompt: "밤에 근육이 당기거나 쥐가 잘 나나요?", type: "likert4" },
    { prompt: "숙면을 취하기 어렵다고 느끼시나요?", type: "likert4" },
    {
      prompt: "두통이나 편두통으로 일상이 불편할 때가 있나요?",
      type: "likert4",
    },
    { prompt: "변비로 불편한 날이 있나요?", type: "likert4" },
    { prompt: "카페인 섭취가 많은 편인가요?", type: "likert4" },
  ],

  garcinia: [
    { prompt: "식욕 조절이 어렵거나 과식을 자주 하시나요?", type: "likert4" },
    { prompt: "야식이나 간식을 자주 드시나요?", type: "likert4" },
    { prompt: "체중 관리 목표가 뚜렷하신가요?", type: "likert4" },
    {
      prompt: "쉐이크·캡슐 등 체중 관리 제품을 사용해 본 적이 있나요?",
      type: "yesno",
    },
    { prompt: "운동과 함께 관리해 볼 의지가 있으신가요?", type: "likert4" },
  ],

  multivitamin: [
    { prompt: "끼니를 거르거나 식단 균형이 자주 무너지나요?", type: "likert4" },
    { prompt: "컨디션·에너지 기복이 큰 편인가요?", type: "likert4" },
    { prompt: "채소·과일·통곡물을 충분히 드시지 못하나요?", type: "likert4" },
    { prompt: "수면·운동·식사 시간이 불규칙한가요?", type: "likert4" },
    { prompt: "영양제를 꾸준히 챙겨 드실 의지가 있으신가요?", type: "likert4" },
  ],

  zn: [
    { prompt: "자잘한 감염이나 잔병치레가 잦은 편인가요?", type: "likert4" },
    { prompt: "상처가 아물기까지 시간이 오래 걸리나요?", type: "likert4" },
    { prompt: "여드름·염증 같은 트러블이 자주 올라오나요?", type: "likert4" },
    { prompt: "모발이나 손톱이 약하다고 느끼시나요?", type: "likert4" },
    { prompt: "유제품·해산물 섭취가 적은 편인가요?", type: "likert4" },
  ],

  psyllium: [
    { prompt: "배변이 불규칙하거나 변비로 고생하시나요?", type: "likert4" },
    { prompt: "물과 식이섬유를 충분히 드시지 못하나요?", type: "likert4" },
    { prompt: "하루 활동량이나 운동이 부족한 편인가요?", type: "likert4" },
    { prompt: "가공식품을 자주 드시는 편인가요?", type: "likert4" },
    { prompt: "체중 관리를 시도하고 계신가요?", type: "likert4" },
  ],

  minerals: [
    {
      prompt: "땀을 많이 흘리거나 더운 환경에서 일할 때가 많나요?",
      type: "likert4",
    },
    {
      prompt: "식단이 한쪽으로 치우치거나 편식이 있으신가요?",
      type: "likert4",
    },
    { prompt: "짠맛이나 단맛을 특히 선호하시나요?", type: "likert4" },
    { prompt: "패스트푸드·인스턴트 섭취가 잦은 편인가요?", type: "likert4" },
    { prompt: "근육 피로를 자주 느끼시나요?", type: "likert4" },
  ],

  vita: [
    {
      prompt: "어두운 곳으로 이동할 때 시야 적응이 더딘 편인가요?",
      type: "likert4",
    },
    { prompt: "눈·피부·점막이 건조하게 느껴질 때가 많나요?", type: "likert4" },
    { prompt: "간·달걀·녹황색채소를 자주 드시지 못하나요?", type: "likert4" },
    {
      prompt: "야외에서 강한 햇빛에 노출되는 시간이 많은가요?",
      type: "likert4",
    },
    { prompt: "어두운 장소에서 색 대비가 약하게 느껴지나요?", type: "likert4" },
  ],

  fe: [
    { prompt: "어지럼·창백·두근거림을 가끔 느끼시나요?", type: "likert4" },
    { prompt: "최근 검사에서 빈혈 의심 소견을 들으셨나요?", type: "yesno" },
    { prompt: "월경량이 많은 편에 해당하시나요?", type: "yesno" },
    {
      prompt: "붉은 고기 등 철 함유 식품을 자주 드시지 못하나요?",
      type: "likert4",
    },
    { prompt: "빈속에 캡슐형 제품을 먹으면 속이 불편한가요?", type: "likert4" },
  ],

  ps: [
    { prompt: "업무·학습에 집중하기가 어렵다고 느끼시나요?", type: "likert4" },
    { prompt: "감정 기복이 크거나 스트레스가 높은 편인가요?", type: "likert4" },
    { prompt: "낮 시간에 졸리거나 무기력할 때가 많나요?", type: "likert4" },
    {
      prompt: "숙면을 취하지 못해 개운하지 않은 날이 많나요?",
      type: "likert4",
    },
    { prompt: "최근 기억력이 예전만 못하다고 느끼시나요?", type: "likert4" },
  ],

  folate: [
    { prompt: "임신을 계획 중이거나 초기 임신에 해당하시나요?", type: "yesno" },
    {
      prompt: "빈혈 또는 특정 혈액 지표 이상을 지적받은 적이 있으신가요?",
      type: "yesno",
    },
    {
      prompt: "지난 1주 동안 녹황색 채소·강화 곡물을 몇 번 드셨나요?",
      type: "freq_wk4",
    },
    { prompt: "평소 야채 섭취가 적은 편인가요?", type: "likert4" },
    {
      prompt: "메토트렉세이트·항경련제 등 특정 약물을 복용 중이신가요?",
      type: "yesno",
    },
  ],

  arginine: [
    {
      prompt: "손발 저림이나 말초혈류 불편을 느낄 때가 있나요?",
      type: "likert4",
    },
    {
      prompt: "지난 1주 동안 숨이 찰 정도의 고강도 운동을 몇 번 하셨나요?",
      type: "freq_wk4",
    },
    {
      prompt: "혈압·혈관 관리를 더 신경 쓸 필요가 있다고 느끼시나요?",
      type: "likert4",
    },
    { prompt: "지구력을 보완하고 싶다고 느끼시나요?", type: "likert4" },
    {
      prompt: "운동 전후 분말형 제품(아미노산 등)을 먹으면 속이 더부룩한가요?",
      type: "likert4",
    },
  ],

  chondroitin: [
    { prompt: "무릎·관절이 자주 아프거나 자극에 민감한가요?", type: "likert4" },
    {
      prompt: "아침에 관절이 뻣뻣해 풀리는 데 시간이 걸리나요?",
      type: "likert4",
    },
    { prompt: "계단을 오르내릴 때 불편함을 느끼시나요?", type: "likert4" },
    {
      prompt: "관절 보조 제품을 일정 기간 꾸준히 써 본 적이 있나요?",
      type: "likert4",
    },
    {
      prompt: "운동이나 체중 관리를 병행할 계획이 있으신가요?",
      type: "likert4",
    },
  ],

  coq10: [
    {
      prompt: "지질 저하제(예: 스타틴 계열)를 복용 중이신가요?",
      type: "yesno",
    },
    { prompt: "무기력하거나 쉽게 피로를 느끼시나요?", type: "likert4" },
    {
      prompt: "심혈관·에너지 쪽 보완이 필요하다고 느끼시나요?",
      type: "likert4",
    },
    { prompt: "근육통을 예방·관리하고 싶으신가요?", type: "likert4" },
    {
      prompt: "강도 높은 운동 후 회복이 더디다고 느끼시나요?",
      type: "likert4",
    },
  ],

  collagen: [
    {
      prompt: "피부 탄력 감소나 주름이 눈에 띄어 걱정되시나요?",
      type: "likert4",
    },
    { prompt: "관절이나 힘줄 부위가 불편할 때가 있나요?", type: "likert4" },
    {
      prompt: "단백질 식품(육류·달걀·콩류 등)을 충분히 드시지 못하나요?",
      type: "likert4",
    },
    { prompt: "야외활동이 잦아 자외선 노출이 많은 편인가요?", type: "likert4" },
    {
      prompt: "과일·채소와 단백질 식품을 함께 챙겨 드실 수 있나요?",
      type: "likert4",
    },
  ],
} as const;
