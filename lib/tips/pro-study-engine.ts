export type ProInstrumentId = "PSQI" | "ISI" | "PSS10";
export type ProAnswers = { instrument: ProInstrumentId; responses: number[] };
export type FollowupRecord = {
  week: 2 | 4;
  answers: ProAnswers;
  adherencePercent: number;
  adverseEvent: boolean;
  eventId?: string;
  rndRawScore?: number;
  rndInterpretation?: Record<string, unknown>;
};
export type StudyParticipant = {
  id: string;
  name: string;
  age: number;
  goal: string;
  enrolledAt: string;
  baseline: ProAnswers;
  recommendation: string[];
  followups: FollowupRecord[];
  mode: "live" | "simulation";
  executionId?: string;
  planId?: string;
  baselineEventId?: string;
  baselineRawScore?: number;
  lastRndInterpretation?: Record<string, unknown>;
  recommendationRun?: { runAt: string; modelVersion: string; modelSha256: string };
};

export type ProInstrument = {
  id: ProInstrumentId;
  name: string;
  recallPeriod: string;
  itemCount: number;
  itemMin: number;
  itemMax: number;
  scoreMin: number;
  scoreMax: number;
  lowerIsBetter: boolean;
  scoreDescription: string;
  sourceUrl: string;
  fields: string[];
};

export const PRO_INSTRUMENTS: Record<ProInstrumentId, ProInstrument> = {
  PSQI: {
    id: "PSQI",
    name: "피츠버그 수면의 질 지수(PSQI)",
    recallPeriod: "최근 1개월",
    itemCount: 7,
    itemMin: 0,
    itemMax: 3,
    scoreMin: 0,
    scoreMax: 21,
    lowerIsBetter: true,
    scoreDescription: "공식 문항을 채점해 만든 7개 구성요소 점수의 합",
    sourceUrl: "https://www.sleep.pitt.edu/psqi",
    fields: ["주관적 수면의 질", "잠들기까지 걸린 시간", "수면 시간", "수면 효율", "수면 방해", "수면제 사용", "주간 기능 저하"],
  },
  ISI: {
    id: "ISI",
    name: "불면증 심각도 지수(ISI)",
    recallPeriod: "최근 2주",
    itemCount: 7,
    itemMin: 0,
    itemMax: 4,
    scoreMin: 0,
    scoreMax: 28,
    lowerIsBetter: true,
    scoreDescription: "공식 7개 문항 점수의 합",
    sourceUrl: "https://eprovide.mapi-trust.org/instruments/insomnia-severity-index",
    fields: ["잠들기 어려움", "수면 유지 어려움", "이른 기상", "현재 수면 만족도", "일상 기능 방해", "주변에서 알아챈 기능 저하", "수면 문제에 대한 걱정"],
  },
  PSS10: {
    id: "PSS10",
    name: "지각된 스트레스 척도(PSS-10)",
    recallPeriod: "최근 1개월",
    itemCount: 10,
    itemMin: 0,
    itemMax: 4,
    scoreMin: 0,
    scoreMax: 40,
    lowerIsBetter: true,
    scoreDescription: "10개 문항 중 4·5·7·8번을 역채점한 뒤 합산",
    sourceUrl: "https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pss.html",
    fields: ["문항 1", "문항 2", "문항 3", "문항 4(역채점)", "문항 5(역채점)", "문항 6", "문항 7(역채점)", "문항 8(역채점)", "문항 9", "문항 10"],
  },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number(value) || 0));

export function emptyProAnswers(instrument: ProInstrumentId): ProAnswers {
  const definition = PRO_INSTRUMENTS[instrument];
  return { instrument, responses: Array.from({ length: definition.itemCount }, () => definition.itemMin) };
}

export function proScore(answers: ProAnswers): number {
  const definition = PRO_INSTRUMENTS[answers.instrument];
  const values = Array.from({ length: definition.itemCount }, (_, index) => clamp(answers.responses[index] ?? 0, definition.itemMin, definition.itemMax));
  if (answers.instrument === "PSS10") return values.reduce((sum, value, index) => sum + ([3, 4, 6, 7].includes(index) ? 4 - value : value), 0);
  return values.reduce((sum, value) => sum + value, 0);
}

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export function baselineReference(participants: StudyParticipant[], instrument: ProInstrumentId) {
  const scores = participants.filter((participant) => participant.mode === "simulation" && participant.baseline.instrument === instrument).map((participant) => proScore(participant.baseline));
  const definition = PRO_INSTRUMENTS[instrument];
  if (scores.length < 2) return { mean: (definition.scoreMin + definition.scoreMax) / 2, sd: (definition.scoreMax - definition.scoreMin) / 6 };
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const variance = scores.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (scores.length - 1);
  return { mean, sd: Math.max(Math.sqrt(variance), 0.01) };
}

export function standardizedImprovement(baseline: ProAnswers, followup: ProAnswers, reference: { mean: number; sd: number }): number {
  if (baseline.instrument !== followup.instrument) throw new Error("pro_instrument_mismatch");
  const preHealthZ = (reference.mean - proScore(baseline)) / reference.sd;
  const postHealthZ = (reference.mean - proScore(followup)) / reference.sd;
  return 100 * (normalCdf(postHealthZ) - normalCdf(preHealthZ));
}

export function participantResult(participant: StudyParticipant, reference = baselineReference([participant], participant.baseline.instrument)) {
  const baselineScore = participant.mode === "live" ? participant.baselineRawScore ?? null : proScore(participant.baseline);
  const latest = [...participant.followups].filter((row) => row.answers.instrument === participant.baseline.instrument).sort((a, b) => b.week - a.week)[0];
  const latestScore = latest ? participant.mode === "live" ? latest.rndRawScore ?? null : proScore(latest.answers) : null;
  const observed = latest?.rndInterpretation?.mean_health_z_change;
  const change = latest ? participant.mode === "live" ? typeof observed === "number" ? observed : null : standardizedImprovement(participant.baseline, latest.answers, reference) : null;
  return { baselineScore, latest, latestScore, change, improved: change !== null && change > 0 };
}

export function cohortKpis(participants: StudyParticipant[]) {
  const completedParticipants = participants.filter((participant) => participant.followups.some((row) => row.week === 4 && row.answers.instrument === participant.baseline.instrument));
  const completed = completedParticipants.map((participant) => participantResult(participant, baselineReference(participants, participant.baseline.instrument)));
  const changes = completed.map((row) => row.change).filter((value): value is number => value !== null);
  const adherence = completed.map((row) => row.latest!.adherencePercent);
  return {
    enrolled: participants.length,
    week2Completed: participants.filter((participant) => participant.followups.some((row) => row.week === 2)).length,
    completed: completed.length,
    completionPercent: participants.length ? (completed.length / participants.length) * 100 : 0,
    meanChange: changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0,
    improvedCount: completed.filter((row) => row.improved).length,
    improvedPercent: completed.length ? (completed.filter((row) => row.improved).length / completed.length) * 100 : 0,
    meanAdherencePercent: adherence.length ? adherence.reduce((a, b) => a + b, 0) / adherence.length : 0,
    adverseEventCount: participants.reduce((sum, participant) => sum + participant.followups.filter((row) => row.adverseEvent).length, 0),
    kpiSamplePassed: completed.length >= 100,
    kpiEffectPassed: completed.length >= 100 && changes.length > 0 && changes.reduce((a, b) => a + b, 0) / changes.length > 0,
  };
}
