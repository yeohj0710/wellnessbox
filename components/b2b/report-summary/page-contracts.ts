import type { SurveyDetailPageModel } from "./SurveyDetailPages";

export type ReportSummaryScoreDisplay = {
  valueText: string;
  unitText?: string;
};

export type ReportSummaryRadarAxis = {
  id: string;
  outerX: number;
  outerY: number;
  valueX: number;
  valueY: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
  labelLines: string[];
  scoreText: string;
};

export type ReportSummarySectionNeedRow = {
  sectionId: string;
  sectionTitle: string;
  percent: number;
  percentText: string;
};

export type ReportSummaryHealthMetricRow = {
  label: string;
  value: string;
  statusLabel: string;
};

export type ReportSummaryMedicationRow = {
  medicationName: string;
  hospitalName: string;
  date: string;
};

export type ReportSummaryOverviewText = {
  pageKicker: string;
  title: string;
  subtitle: string;
  employeeLabel: string;
  periodLabel: string;
  generatedLabel: string;
  scoreTitle: string;
  scoreAriaLabel: string;
  scoreFormula: string;
  lifestyleRiskTitle: string;
  lifestyleRiskAriaLabel: string;
  lifestyleRiskOverallLabel: string;
  healthNeedTitle: string;
  healthNeedEmpty: string;
  healthNeedAverageLabel: string;
  healthNeedMoreLabel: string;
};

export type ReportSummaryHealthPageText = {
  pageKicker: string;
  title: string;
  subtitle: string;
  metricsTitle: string;
  metricsEmpty: string;
  insightTitle: string;
};

export type ReportSummaryFinalCommentPageText = {
  pageKicker: string;
  title: string;
  subtitle: string;
  bodyTitle: string;
  footerLabel: string;
};

export type ReportSummaryMedicationPageText = {
  pageKicker: string;
  title: string;
  subtitle: string;
  medicationTitle: string;
  medicationEmpty: string;
  generatedLabel: string;
  employeeLabel: string;
  periodLabel: string;
  mockSuffix: string;
};

export type ReportSummaryOverviewPageProps = {
  donutRadius: number;
  donutCircumference: number;
  donutOffset: number;
  radarLevels: number[];
  radarCenterX: number;
  radarCenterY: number;
  radarAxes: ReportSummaryRadarAxis[];
  radarAreaPoints: string;
  resolvedHealthScore: ReportSummaryScoreDisplay;
  lifestyleOverallText: string;
  sectionNeedsForPage1: ReportSummarySectionNeedRow[];
  healthNeedAverageText: string;
  hiddenSectionNeedCount: number;
  firstPageSurveyDetails: SurveyDetailPageModel;
  hasFirstPageSurveyContent: boolean;
  hasSectionAdviceContent: boolean;
  metaEmployeeName: string;
  metaPeriodKey: string;
  metaGeneratedAt: string;
  text: ReportSummaryOverviewText;
};

export type ReportSummaryHealthPageProps = {
  pageNumber: number;
  healthMetrics: ReportSummaryHealthMetricRow[];
  healthInsightEmptyMessage: string;
  text: ReportSummaryHealthPageText;
};

export type ReportSummaryFinalCommentPageProps = {
  pageNumber: number;
  comment: string;
  metaEmployeeName: string;
  text: ReportSummaryFinalCommentPageText;
};

export type ReportSummaryMedicationPageProps = {
  pageNumber: number;
  medications: ReportSummaryMedicationRow[];
  medicationStatusMessage: string;
  viewerMode: "employee" | "admin";
  metaGeneratedAt: string;
  metaEmployeeName: string;
  metaPeriodKey: string;
  metaIsMockData: boolean;
  buildMedicationMetaLine: (input: { date: string; hospitalName: string }) => string;
  text: ReportSummaryMedicationPageText;
};
