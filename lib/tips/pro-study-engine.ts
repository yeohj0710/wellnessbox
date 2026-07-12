export type ProAnswers = { sleep: number; fatigue: number; stress: number; wellbeing: number };
export type FollowupRecord = { week: 2 | 4; answers: ProAnswers; adherencePercent: number; adverseEvent: boolean };
export type StudyParticipant = {
  id: string; name: string; age: number; goal: string; enrolledAt: string;
  baseline: ProAnswers; recommendation: string[]; followups: FollowupRecord[];
  recommendationRun?: { runAt: string; modelVersion: string; modelSha256: string };
};

const clamp = (value: number) => Math.max(0, Math.min(10, Number(value) || 0));

export function proScore(answers: ProAnswers) {
  const positive = clamp(answers.sleep) + (10 - clamp(answers.fatigue)) +
    (10 - clamp(answers.stress)) + clamp(answers.wellbeing);
  return (positive / 40) * 100;
}

export function participantResult(participant: StudyParticipant) {
  const baselineScore = proScore(participant.baseline);
  const latest = [...participant.followups].sort((a, b) => b.week - a.week)[0];
  const latestScore = latest ? proScore(latest.answers) : null;
  const change = latestScore === null ? null : latestScore - baselineScore;
  return { baselineScore, latest, latestScore, change, responder: change !== null && change >= 10 };
}

export function cohortKpis(participants: StudyParticipant[]) {
  const completedParticipants = participants.filter((participant) => participant.followups.some((row) => row.week === 4));
  const completed = completedParticipants.map(participantResult);
  const changes = completed.map((row) => row.change as number);
  const adherence = completed.map((row) => row.latest!.adherencePercent);
  return {
    enrolled: participants.length,
    week2Completed: participants.filter((participant) => participant.followups.some((row) => row.week === 2)).length,
    completed: completed.length,
    completionPercent: participants.length ? (completed.length / participants.length) * 100 : 0,
    meanChange: changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0,
    responderCount: completed.filter((row) => row.responder).length,
    responderPercent: completed.length ? (completed.filter((row) => row.responder).length / completed.length) * 100 : 0,
    meanAdherencePercent: adherence.length ? adherence.reduce((a, b) => a + b, 0) / adherence.length : 0,
    adverseEventCount: participants.reduce((sum, participant) => sum + participant.followups.filter((row) => row.adverseEvent).length, 0),
  };
}
