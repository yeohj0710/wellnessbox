export const ASSESS_STORAGE_KEY = "assess-state";
export const ASSESS_C_PERSIST_KEY = `${ASSESS_STORAGE_KEY}::C`;

type AssessStateSnapshot = {
  section?: "INTRO" | "A" | "B" | "C" | "DONE";
  answers?: Record<string, any>;
  current?: string;
  fixedIdx?: number;
  history?: string[];
  cCats?: string[];
  cAnswers?: Record<string, number[]>;
  cResult?: any;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function loadAssessStateSnapshot(storageKey: string) {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AssessStateSnapshot;
  } catch {
    return null;
  }
}

export function saveAssessStateSnapshot(
  storageKey: string,
  snapshot: AssessStateSnapshot
) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {}
}

export function clearAssessStorage(storageKey: string, cPersistKey: string) {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(cPersistKey);
  } catch {}
}

export function clearAssessCPersistStorage(cPersistKey: string) {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(cPersistKey);
  } catch {}
}

export function rollbackLatestCStateAnswer(cPersistKey: string) {
  if (!canUseStorage()) return;
  try {
    const raw = localStorage.getItem(cPersistKey);
    if (!raw) return;
    const obj = JSON.parse(raw);
    const cState = obj?.cState;
    const step = typeof cState?.step === "number" ? cState.step : 0;
    const pair = Array.isArray(cState?.plan) ? cState.plan[step] : null;
    if (!pair || !cState?.filled?.[pair.cat]?.[pair.qIdx]) return;

    cState.filled[pair.cat][pair.qIdx] = false;
    if (Array.isArray(cState?.answers?.[pair.cat])) {
      cState.answers[pair.cat][pair.qIdx] = -1;
    }
    obj.cState = cState;
    localStorage.setItem(cPersistKey, JSON.stringify(obj));
  } catch {}
}
