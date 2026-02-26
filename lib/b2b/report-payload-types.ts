import type { ReportScoreDetailMap } from "@/lib/b2b/report-score-engine";

export type B2bReportPayload = {
  meta: {
    employeeId: string;
    employeeName: string;
    birthDateMasked: string;
    phoneMasked: string;
    generatedAt: string;
    periodKey: string;
    reportCycle: number | null;
    variantIndex: number;
    stylePreset: string;
    sourceMode: string | null;
    isMockData: boolean;
  };
  health: {
    fetchedAt: string | null;
    metrics: Array<{ metric: string; value: string; unit: string | null }>;
    coreMetrics: Array<{
      key: string;
      label: string;
      value: string;
      unit: string | null;
      status: string;
    }>;
    riskFlags: Array<{
      key: string;
      label: string;
      severity: string;
      value: string;
      reason: string;
    }>;
    abnormalFlags: string[];
    medications: Array<{
      medicationName: string;
      hospitalName: string | null;
      date: string | null;
      dosageDay: string | null;
    }>;
    fetchStatus: {
      partial: boolean;
      failedTargets: string[];
    };
    medicationStatus: {
      type: "available" | "none" | "fetch_failed" | "unknown";
      message: string | null;
      failedTargets: string[];
    };
  };
  survey: {
    templateVersion: number | null;
    selectedSections: string[];
    sectionScores: Array<{
      sectionKey: string;
      sectionTitle: string;
      score: number;
      answeredCount: number;
      questionCount: number;
    }>;
    overallScore: number | null;
    topIssues: Array<{
      sectionKey: string;
      title: string;
      score: number;
    }>;
    answers: Array<{
      questionKey: string;
      sectionKey: string | null;
      answerText: string | null;
      answerValue: string | null;
    }>;
    updatedAt: string | null;
  };
  analysis: {
    version: number | null;
    periodKey: string;
    reportCycle: number | null;
    payload: unknown;
    summary: {
      overallScore: number | null;
      surveyScore: number | null;
      healthScore: number | null;
      medicationScore: number | null;
      riskLevel: string;
      topIssues: Array<{
        sectionKey: string;
        title: string;
        score: number;
      }>;
    };
    scoreDetails: ReportScoreDetailMap;
    scoreEngineVersion: string;
    riskFlags: string[];
    recommendations: string[];
    trend: {
      months: Array<{
        periodKey: string;
        overallScore: number;
        surveyScore: number;
        healthScore: number;
      }>;
    };
    externalCards: Array<{
      key: string;
      title: string;
      value: string;
    }>;
    aiEvaluation: {
      generatedAt: string;
      model: string;
      summary: string;
      monthlyGuide: string;
      actionItems: string[];
      caution: string;
    } | null;
    wellness: {
      schemaVersion: string;
      selectedSections: string[];
      lifestyleRisk: {
        domainScoresNormalized: Record<string, number>;
        domainScoresPercent: Record<string, number>;
        domains: Array<{
          id: string;
          name: string;
          normalized: number;
          percent: number;
        }>;
        overallPercent: number;
      };
      healthManagementNeed: {
        sectionNeedPercentById: Record<string, number>;
        sections: Array<{
          sectionId: string;
          sectionTitle: string;
          percent: number;
        }>;
        averagePercent: number;
      };
      overallHealthScore: number;
      sectionAdvice: Record<
        string,
        {
          sectionTitle: string;
          items: Array<{ questionNumber: number; text: string }>;
        }
      >;
      lifestyleRoutineAdvice: string[];
      supplementDesign: Array<{
        sectionId: string;
        title: string;
        paragraphs: string[];
      }>;
      perQuestionScores: {
        common: Record<string, number | null>;
        sections: Record<string, Record<string, number | null>>;
      };
    } | null;
    updatedAt: string | null;
  };
  pharmacist: {
    note: string | null;
    recommendations: string | null;
    cautions: string | null;
    summary: string | null;
    dosingGuide: string | null;
    updatedAt: string | null;
  };
};
