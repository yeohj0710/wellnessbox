type ReportStatusInput = {
  id: string;
  variantIndex: number;
  status: string;
  updatedAt: Date;
};

type ReportCompactInput = {
  id: string;
  variantIndex: number;
  status: string;
};

type ReportDetailInput = {
  id: string;
  variantIndex: number;
  status: string;
  pageSize: string;
  stylePreset?: string | null;
  periodKey: string | null;
  reportCycle: number | null;
  reportPayload: unknown;
  layoutDsl: unknown;
  exportAudit: unknown;
  updatedAt: Date;
};

type ReportListItemInput = {
  id: string;
  variantIndex: number;
  status: string;
  pageSize: string;
  stylePreset: string | null;
  periodKey: string | null;
  reportCycle: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeB2bReportStatus(report: ReportStatusInput) {
  return {
    id: report.id,
    variantIndex: report.variantIndex,
    status: report.status,
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function serializeB2bReportCompact(report: ReportCompactInput) {
  return {
    id: report.id,
    variantIndex: report.variantIndex,
    status: report.status,
  };
}

export function serializeB2bReportDetail(
  report: ReportDetailInput,
  fallbackPeriodKey: string,
  options: { includeStylePreset?: boolean } = {}
) {
  const base = {
    id: report.id,
    variantIndex: report.variantIndex,
    status: report.status,
    pageSize: report.pageSize,
    periodKey: report.periodKey ?? fallbackPeriodKey,
    reportCycle: report.reportCycle ?? null,
    payload: report.reportPayload,
    layoutDsl: report.layoutDsl,
    exportAudit: report.exportAudit,
    updatedAt: report.updatedAt.toISOString(),
  };
  if (!options.includeStylePreset) return base;
  return {
    ...base,
    stylePreset: report.stylePreset ?? null,
  };
}

export function serializeB2bReportListItem(report: ReportListItemInput) {
  return {
    id: report.id,
    variantIndex: report.variantIndex,
    status: report.status,
    pageSize: report.pageSize,
    stylePreset: report.stylePreset,
    periodKey: report.periodKey ?? null,
    reportCycle: report.reportCycle ?? null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
