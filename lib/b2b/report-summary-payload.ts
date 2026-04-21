import type { ReportScoreDetailMap } from "@/lib/b2b/report-score-engine";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";

export type ReportSummaryPayload = {
  meta?: {
    employeeName?: string;
    generatedAt?: string;
    periodKey?: string;
    stylePreset?: string;
    isMockData?: boolean;
  };
  analysis?: {
    summary?: {
      overallScore?: number | null;
      surveyScore?: number | null;
      healthScore?: number | null;
      medicationScore?: number | null;
      riskLevel?: string;
      topIssues?: Array<{ title?: string; score?: number; reason?: string }>;
    };
    scoreDetails?: Partial<ReportScoreDetailMap>;
    recommendations?: string[];
    trend?: {
      months?: Array<{
        periodKey?: string;
        overallScore?: number;
        surveyScore?: number;
        healthScore?: number;
      }>;
    };
    aiEvaluation?: {
      summary?: string;
      monthlyGuide?: string;
      actionItems?: string[];
      caution?: string;
    } | null;
    wellness?: {
      schemaVersion?: string;
      selectedSections?: string[];
      lifestyleRisk?: {
        overallPercent?: number;
        domains?: Array<{
          id?: string;
          name?: string;
          normalized?: number;
          percent?: number;
        }>;
      };
      healthManagementNeed?: {
        averagePercent?: number;
        sections?: Array<{
          sectionId?: string;
          sectionTitle?: string;
          percent?: number;
        }>;
      };
      overallHealthScore?: number;
      sectionAdvice?: Record<
        string,
        {
          sectionTitle?: string;
          items?: Array<{
            questionNumber?: number;
            score?: number;
            text?: string;
            questionKey?: string;
            questionText?: string;
            answerText?: string | null;
          }>;
        }
      >;
      highRiskHighlights?: Array<{
        category?: "detailed" | "common" | "domain" | "section";
        title?: string;
        score?: number;
        action?: string;
        questionNumber?: number;
        sectionId?: string;
        questionKey?: string;
        questionText?: string;
        answerText?: string;
      }>;
      lifestyleRoutineAdvice?: string[];
      supplementDesign?: Array<{
        sectionId?: string;
        title?: string;
        paragraphs?: string[];
        recommendedNutrients?: Array<{
          code?: string;
          label?: string;
          labelKo?: string;
          aliases?: string[];
        }>;
      }>;
      perQuestionScores?: {
        common?: Record<string, number | null>;
        sections?: Record<string, Record<string, number | null>>;
      };
    } | null;
  };
  survey?: {
    sectionScores?: Array<{
      sectionTitle?: string;
      score?: number;
      answeredCount?: number;
      questionCount?: number;
    }>;
    answers?: Array<{
      questionKey?: string;
      sectionKey?: string | null;
      questionText?: string | null;
      answerText?: string | null;
      answerValue?: string | null;
    }>;
  };
  health?: {
    fetchedAt?: string | null;
    metrics?: Array<{
      metric?: string;
      value?: string;
      unit?: string | null;
    }>;
    coreMetrics?: Array<{
      label?: string;
      value?: string;
      unit?: string | null;
      status?: string;
    }>;
    medicationStatus?: {
      type?: "available" | "none" | "fetch_failed" | "unknown";
      message?: string | null;
      failedTargets?: string[];
    };
    medications?: Array<{
      medicationName?: string;
      date?: string | null;
      dosageDay?: string | null;
      hospitalName?: string | null;
    }>;
  };
  pharmacist?: {
    note?: string | null;
    summary?: string | null;
    recommendations?: string | null;
    cautions?: string | null;
  };
  reportAddendum?: {
    consultationSummary?: string | null;
    packagedProducts?: B2bReportPackagedProduct[];
  };
};
