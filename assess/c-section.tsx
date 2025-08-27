"use client";
import { useState } from 'react';

type QType =
  | 'yesno'
  | 'likert4'
  | 'freq_wk4'
  | 'servings_day4'
  | 'water_cups_day4';

type Q = { prompt: string; type: QType };

const BANK: Record<string, Q[]> = {
  vitc: [
    { prompt: '잔병치레(감기·인후통 등)를 자주 겪는다', type: 'likert4' },
    { prompt: '잇몸에서 쉽게 피가 나거나 붓는다', type: 'likert4' },
    { prompt: '상처가 잘 아물지 않는 편이다', type: 'likert4' },
    { prompt: '과일·채소 섭취(1회=주먹 크기)가 충분하다', type: 'servings_day4' },
    { prompt: '흡연 또는 잦은 간접흡연에 노출된다', type: 'likert4' },
  ],
  omega3: [
    { prompt: '등푸른 생선(고등어·연어 등) 섭취 빈도', type: 'freq_wk4' },
    { prompt: '혈중 중성지방 지적을 받았거나 가족력이 있다', type: 'yesno' },
    { prompt: '관절·피부·눈의 건조/염증 증상이 있다', type: 'likert4' },
    { prompt: '장시간 화면 사용 후 눈의 피로/건조가 심하다', type: 'likert4' },
    { prompt: '심혈관 건강 개선에 대한 필요성을 크게 느낀다', type: 'likert4' },
  ],
  ca: [
    { prompt: '유제품·칼슘 강화 식품 섭취(우유·치즈 등)', type: 'servings_day4' },
    { prompt: '골밀도 감소/골다공증 지적 또는 가족력이 있다', type: 'yesno' },
    { prompt: '체중부하 운동(걷기·근력 등) 빈도', type: 'freq_wk4' },
    { prompt: '폐경 이후이거나 50세 이상 여성이다', type: 'yesno' },
    { prompt: '최근 몇 년 내 골절을 경험했다', type: 'yesno' },
  ],
  lutein: [
    { prompt: '야간 시야 불편/눈부심으로 어려움을 겪는다', type: 'likert4' },
    { prompt: '화면 사용 시간이 길어 눈 피로가 크다', type: 'likert4' },
    { prompt: '녹황색 채소(시금치·케일 등) 섭취', type: 'servings_day4' },
    { prompt: '강한 빛/햇빛에 눈이 매우 민감하다', type: 'likert4' },
    { prompt: '루테인·지아잔틴 풍부 식품 섭취 빈도', type: 'freq_wk4' },
  ],
  vitd: [
    { prompt: '햇빛 노출이 부족하다고 느낀다', type: 'likert4' },
    { prompt: '뼈/근육 통증 또는 힘 없음이 잦다', type: 'likert4' },
    { prompt: '최근 혈중 비타민D가 낮다고 지적받았다', type: 'yesno' },
    { prompt: '자외선 차단제를 상시 사용한다', type: 'likert4' },
    { prompt: '실내 생활 시간이 매우 길다', type: 'likert4' },
  ],
  milkthistle: [
    { prompt: '음주 빈도/폭음으로 간 피로를 느낀다', type: 'likert4' },
    { prompt: '간수치 이상/지방간 지적을 받은 적이 있다', type: 'yesno' },
    { prompt: '숙취·피로 회복이 더디다', type: 'likert4' },
    { prompt: '간 대사에 부담되는 약을 장기 복용 중이다', type: 'yesno' },
    { prompt: '체력 저하와 함께 오른쪽 상복부 불편감이 잦다', type: 'likert4' },
  ],
  probiotics: [
    { prompt: '복부 팽만·가스·더부룩함이 잦다', type: 'likert4' },
    { prompt: '배변 주기/형태가 불규칙하다', type: 'likert4' },
    { prompt: '최근 3개월 내 항생제를 복용했다', type: 'yesno' },
    { prompt: '발효식품(요구르트·김치 등) 섭취', type: 'freq_wk4' },
    { prompt: '복통/과민성장 증상 의심', type: 'likert4' },
  ],
  vitb: [
    { prompt: '지속적인 피로/무기력을 느낀다', type: 'likert4' },
    { prompt: '구내염·입술 갈라짐이 잦다', type: 'likert4' },
    { prompt: '스트레스·과로 수준이 높다', type: 'likert4' },
    { prompt: '음주 빈도가 높은 편이다', type: 'likert4' },
    { prompt: '가공식품/정제 곡물 위주 식사를 한다', type: 'likert4' },
  ],
  mg: [
    { prompt: '근육 경련·쥐가 자주 난다', type: 'likert4' },
    { prompt: '수면의 질이 낮다', type: 'likert4' },
    { prompt: '두통/편두통이 잦다', type: 'likert4' },
    { prompt: '변비로 불편함을 자주 겪는다', type: 'likert4' },
    { prompt: '카페인 섭취가 많다', type: 'likert4' },
  ],
  garcinia: [
    { prompt: '식욕 조절이 어렵다/과식이 잦다', type: 'likert4' },
    { prompt: '야식·단당류 위주 식사가 잦다', type: 'likert4' },
    { prompt: '체중 관리 목표가 뚜렷하고 강하다', type: 'likert4' },
    { prompt: '체중 관리 보조제 사용 경험이 있고 순응도가 좋다', type: 'yesno' },
    { prompt: '운동 병행 의지가 높다', type: 'likert4' },
  ],
  multivitamin: [
    { prompt: '끼니를 거르거나 식단 다양성이 낮다', type: 'likert4' },
    { prompt: '전반적 컨디션 저하/피로가 지속된다', type: 'likert4' },
    { prompt: '과일·채소·통곡물 섭취가 부족하다', type: 'likert4' },
    { prompt: '수면·활동·식사가 불규칙하다', type: 'likert4' },
    { prompt: '알약 복용 성실도(꾸준함)가 높은 편이다', type: 'likert4' },
  ],
  zn: [
    { prompt: '감기/감염 증상이 잦다', type: 'likert4' },
    { prompt: '여드름·염증성 피부 고민이 있다', type: 'likert4' },
    { prompt: '상처 치유가 느린 편이다', type: 'likert4' },
    { prompt: '맛·냄새가 둔해진 느낌이 있다', type: 'yesno' },
    { prompt: '붉은 고기(아연 함유) 섭취 빈도', type: 'freq_wk4' },
  ],
  psyllium: [
    { prompt: '변비가 잦다', type: 'likert4' },
    { prompt: '포만감이 낮아 과식을 자주 한다', type: 'likert4' },
    { prompt: 'LDL 개선 등 식이섬유 섭취 필요성을 느낀다', type: 'likert4' },
    { prompt: '하루 물 섭취량(충분히 마신다)', type: 'water_cups_day4' },
    { prompt: '통곡물·과일·채소 등 섬유소 섭취가 충분하다', type: 'likert4' },
  ],
  minerals: [
    { prompt: '땀 많이 나는 활동/사우나/고온 환경 노출', type: 'freq_wk4' },
    { prompt: '운동 중 갈증·피로로 전해질 보충 필요를 느낀다', type: 'likert4' },
    { prompt: '다리 경련/저림이 잦다', type: 'likert4' },
    { prompt: '저염식 또는 이뇨제 복용 중이다', type: 'yesno' },
    { prompt: '견과·해조류 등 미네랄 식품 섭취 빈도', type: 'freq_wk4' },
  ],
  vita: [
    { prompt: '야간 시력 저하(야맹감)를 느낀다', type: 'likert4' },
    { prompt: '눈/피부가 건조하고 거칠다', type: 'likert4' },
    { prompt: '루틴한 스킨케어에도 피부 회복이 느리다', type: 'likert4' },
    { prompt: '간·달걀·유제품 등 비타민A 식품 섭취 빈도', type: 'freq_wk4' },
    { prompt: '비타민A 함유 보충제 복용 경험이 있고 순응도가 좋다', type: 'yesno' },
  ],
  fe: [
    { prompt: '어지러움/창백/숨참/피로를 자주 느낀다', type: 'likert4' },
    { prompt: '최근 검사에서 빈혈/낮은 페리틴 지적', type: 'yesno' },
    { prompt: '월경 과다(해당 시)', type: 'yesno' },
    { prompt: '붉은 고기·철 함유 식품 섭취 빈도', type: 'freq_wk4' },
    { prompt: '철분 복용 시 위장관 불편(변비 등)이 크다', type: 'likert4' },
  ],
  ps: [
    { prompt: '업무/학습 중 집중 유지가 어렵다', type: 'likert4' },
    { prompt: '이름·단어가 잘 떠오르지 않는다(순간 기억 저하)', type: 'likert4' },
    { prompt: '스트레스가 높고 긴장이 지속된', type: 'likert4' },
    { prompt: '오후 시간대 졸림/무기력이 잦다', type: 'likert4' },
    { prompt: '수면의 질이 낮아 인지 효율이 떨어진다', type: 'likert4' },
  ],
  folate: [
    { prompt: '임신 계획 또는 초기 임신(3개월 이내)', type: 'yesno' },
    { prompt: '빈혈 또는 MCV 증가(거대적혈구) 지적', type: 'yesno' },
    { prompt: '녹색잎채소·강화 곡물 섭취 빈도', type: 'freq_wk4' },
    { prompt: '음주 빈도가 높다', type: 'likert4' },
    { prompt: '항경련제·메토트렉세이트 등 엽산 대사 영향 약 복용', type: 'yesno' },
  ],
  arginine: [
    { prompt: '수족 냉증/말초 혈류 불량감을 느낀다', type: 'likert4' },
    { prompt: '고강도 운동 빈도(퍼포먼스 향상 필요)', type: 'freq_wk4' },
    { prompt: '성건강·혈류 관련 고민이 있다', type: 'likert4' },
    { prompt: '혈압/심혈관 리스크 관리 필요성을 느낀다', type: 'likert4' },
    { prompt: '위장 민감성으로 아르기닌 섭취가 부담스럽다', type: 'likert4' },
  ],
  chondroitin: [
    { prompt: '무릎·손가락 등 관절 통증 빈도', type: 'likert4' },
    { prompt: '아침에 관절이 뻣뻣해지는 느낌', type: 'likert4' },
    { prompt: '계단 오르내릴 때 통증/불편', type: 'likert4' },
    { prompt: '글루코사민/콘드로이친 복용 시 체감 효과', type: 'likert4' },
    { prompt: '체중 관리·관절 보호 운동을 병행할 의지', type: 'likert4' },
  ],
  coq10: [
    { prompt: '콜레스테롤 약(스타틴) 복용 중이다', type: 'yesno' },
    { prompt: '피로·무기력이 잦다', type: 'likert4' },
    { prompt: '심혈관 건강/에너지 대사 개선 필요', type: 'likert4' },
    { prompt: '편두통 예방 필요성을 느낀다', type: 'likert4' },
    { prompt: '고강도 운동 후 회복이 더디다', type: 'likert4' },
  ],
  collagen: [
    { prompt: '피부 탄력 저하/주름이 고민이다', type: 'likert4' },
    { prompt: '관절·건 통증 또는 뻣뻣함이 있다', type: 'likert4' },
    { prompt: '단백질 식품 섭취가 부족하다고 느낀다', type: 'likert4' },
    { prompt: '자외선/야외 노출이 잦다', type: 'likert4' },
    { prompt: '비타민C 등 보조 성분과 함께 꾸준 복용 의지', type: 'likert4' },
  ],
};

const OPTIONS: Record<QType, { value: number; label: string }[]> = {
  yesno: [
    { value: 0, label: '아니오' },
    { value: 1, label: '예' },
  ],
  likert4: [
    { value: 0, label: '전혀 아니다' },
    { value: 1, label: '가끔 그렇다' },
    { value: 2, label: '자주 그렇다' },
    { value: 3, label: '항상 그렇다' },
  ],
  freq_wk4: [
    { value: 0, label: '없음' },
    { value: 1, label: '주1' },
    { value: 2, label: '주2–3' },
    { value: 3, label: '주4+' },
  ],
  servings_day4: [
    { value: 0, label: '0–1회/일' },
    { value: 1, label: '2회/일' },
    { value: 2, label: '3–4회/일' },
    { value: 3, label: '5회+/일' },
  ],
  water_cups_day4: [
    { value: 0, label: '0–2잔' },
    { value: 1, label: '3–4잔' },
    { value: 2, label: '5–6잔' },
    { value: 3, label: '7잔+' },
  ],
};

export default function CSection({ cats }: { cats: string[] }) {
  const [answers, setAnswers] = useState<Record<string, number[]>>(
    Object.fromEntries(cats.map((c) => [c, Array(5).fill(0)])) as Record<
      string,
      number[]
    >
  );
  const [filled, setFilled] = useState<Record<string, boolean[]>>(
    Object.fromEntries(cats.map((c) => [c, Array(5).fill(false)])) as Record<
      string,
      boolean[]
    >
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | null
    | { catsOrdered: string[]; scores: number[]; percents: number[] }
  >(null);
  const [error, setError] = useState('');

  const select = (cat: string, qIdx: number, val: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      const arr = [...next[cat]];
      arr[qIdx] = val;
      next[cat] = arr;
      return next;
    });
    setFilled((prev) => {
      const next = { ...prev };
      const arr = [...next[cat]];
      arr[qIdx] = true;
      next[cat] = arr;
      return next;
    });
  };

  const canSubmit = Object.values(filled).every((arr) => arr.every(Boolean));

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/c-section-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cats, answers: cats.map((c) => answers[c]) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: '' }));
        setError(data.error || '서버 오류가 발생했습니다.');
      } else {
        const data = (await res.json()) as {
          catsOrdered: string[];
          scores: number[];
          percents: number[];
        };
        setResult(data);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {cats.map((cat) => (
        <div key={cat} className="space-y-4">
          {BANK[cat]?.map((q, idx) => (
            <div key={idx} className="space-y-2">
              <p className="text-sm text-gray-800">{q.prompt}</p>
              <div className="flex flex-wrap gap-3">
                {OPTIONS[q.type].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`${cat}-${idx}`}
                      value={opt.value}
                      checked={answers[cat][idx] === opt.value}
                      onChange={() => select(cat, idx, opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={!canSubmit || loading}
        onClick={submit}
        className="rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? '계산 중...' : '결과 보기'}
      </button>
      {result && (
        <ul className="mt-4 space-y-1">
          {result.catsOrdered.map((c, i) => (
            <li key={c} className="text-sm">
              {c}: {(result.percents[i] * 100).toFixed(1)}% (
              {result.scores[i].toFixed(2)})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
