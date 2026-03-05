export type EmployeeListItem = {
  id: string;
  appUserId: string | null;
  name: string;
  birthDate: string;
  phoneNormalized: string;
  identityHash: string;
  linkedProvider: string;
  lastSyncedAt: string | null;
  lastViewedAt: string | null;
  updatedAt: string;
  counts: {
    healthSnapshots: number;
    reports: number;
  };
};

export type EmployeeOpsRecord<T> = T & {
  id: string;
};

export type EmployeeOpsResponse = {
  ok: boolean;
  employee: {
    id: string;
    appUserId: string | null;
    name: string;
    birthDate: string;
    phoneNormalized: string;
    identityHash: string;
    linkedProvider: string;
    lastSyncedAt: string | null;
    lastViewedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    periods: string[];
    counts: {
      healthSnapshots: number;
      surveyResponses: number;
      analysisResults: number;
      pharmacistNotes: number;
      reports: number;
      accessLogs: number;
      adminActionLogs: number;
      healthFetchCaches: number;
      healthFetchCachesValid: number;
      healthFetchAttempts: number;
    };
  };
  records: {
    healthSnapshots: Array<
      EmployeeOpsRecord<{
        provider: string;
        sourceMode: string;
        periodKey: string | null;
        reportCycle: number | null;
        fetchedAt: string;
        createdAt: string;
        normalizedShape: unknown;
        rawShape: unknown;
        normalizedJson: unknown;
        rawJson: unknown;
      }>
    >;
    surveyResponses: Array<
      EmployeeOpsRecord<{
        templateId: string;
        templateVersion: number;
        periodKey: string | null;
        reportCycle: number | null;
        selectedSections: string[];
        answersJson: unknown;
        submittedAt: string | null;
        createdAt: string;
        updatedAt: string;
        answers: Array<{
          id: string;
          questionKey: string;
          sectionKey: string | null;
          answerText: string | null;
          answerValue: string | null;
          score: number | null;
          meta: unknown;
        }>;
      }>
    >;
    analysisResults: Array<
      EmployeeOpsRecord<{
        version: number;
        periodKey: string | null;
        reportCycle: number | null;
        payload: unknown;
        computedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>
    >;
    pharmacistNotes: Array<
      EmployeeOpsRecord<{
        periodKey: string | null;
        reportCycle: number | null;
        note: string | null;
        recommendations: string | null;
        cautions: string | null;
        createdByAdminTag: string | null;
        createdAt: string;
        updatedAt: string;
      }>
    >;
    reports: Array<
      EmployeeOpsRecord<{
        variantIndex: number;
        status: string;
        pageSize: string;
        stylePreset: string | null;
        periodKey: string | null;
        reportCycle: number | null;
        reportPayload: unknown;
        layoutDsl: unknown;
        exportAudit: unknown;
        createdAt: string;
        updatedAt: string;
      }>
    >;
    accessLogs: Array<
      EmployeeOpsRecord<{
        action: string;
        route: string | null;
        userAgent: string | null;
        payload: unknown;
        createdAt: string;
      }>
    >;
    adminActionLogs: Array<
      EmployeeOpsRecord<{
        action: string;
        actorTag: string | null;
        payload: unknown;
        createdAt: string;
      }>
    >;
  };
  healthLink: null | {
    provider: string;
    appUserId: string;
    link: null | {
      provider: string;
      linked: boolean;
      loginMethod: string | null;
      loginOrgCd: string | null;
      stepMode: string | null;
      lastLinkedAt: string | null;
      lastFetchedAt: string | null;
      lastErrorCode: string | null;
      lastErrorMessage: string | null;
      hasStepData: boolean;
      hasCookieData: boolean;
      updatedAt: string;
    };
    cacheSummary: {
      totalEntries: number;
      validEntries: number;
    };
    fetchCaches: Array<{
      id: string;
      requestHash: string;
      requestKey: string;
      targets: string[];
      yearLimit: number | null;
      subjectType: string | null;
      statusCode: number;
      ok: boolean;
      partial: boolean;
      fetchedAt: string;
      expiresAt: string;
      hitCount: number;
      lastHitAt: string | null;
    }>;
    fetchAttempts: Array<{
      id: string;
      requestHash: string | null;
      requestKey: string | null;
      identityHash: string | null;
      forceRefresh: boolean;
      cached: boolean;
      statusCode: number | null;
      ok: boolean | null;
      createdAt: string;
    }>;
  };
};

export type DeleteRecordType =
  | "healthSnapshot"
  | "surveyResponse"
  | "analysisResult"
  | "pharmacistNote"
  | "report"
  | "accessLog"
  | "adminActionLog"
  | "healthFetchCache"
  | "healthFetchAttempt";
