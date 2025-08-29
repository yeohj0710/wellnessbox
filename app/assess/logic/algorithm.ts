import { CATEGORY_LABELS, CategoryKey } from "../data/categories";
import { RULES, Answers as ABAnswers } from "./rules";

export type ABTopItem = { key: CategoryKey; label: string; score: number };

export function evaluate(a: ABAnswers): { top: ABTopItem[] } {
  const acc: Record<CategoryKey, number> = {} as any;
  for (const r of RULES) {
    if (!r.eval(a)) continue;
    for (const k in r.weights) {
      const key = k as CategoryKey;
      const w = r.weights[key] ?? 0;
      acc[key] = (acc[key] ?? 0) + w;
    }
  }
  const all = Object.keys(CATEGORY_LABELS).map((k) => k as CategoryKey);
  const scored: ABTopItem[] = all
    .map((k) => ({ key: k, label: CATEGORY_LABELS[k], score: acc[k] ?? 0 }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
  return { top: scored };
}

export { evaluate as evaluateAB };

export type QType =
  | "yesno"
  | "likert4"
  | "freq_wk4"
  | "servings_day4"
  | "water_cups_day4";
export type Pair = { cat: string; qIdx: number };
export type Answers = Record<string, number[]>;
export type Filled = Record<string, boolean[]>;
export type CState = {
  cats: string[];
  step: number;
  answers: Answers;
  filled: Filled;
  plan: Pair[];
  cSeed: string;
  error?: string;
};
export const TRANSITION_MS = 800;
export function domainMax(t: QType) {
  return t === "yesno" ? 1 : 3;
}
export function isStrong(t: QType, v: number) {
  return t === "yesno" ? v === 1 : v >= 2;
}
export function getNextQIdx(cat: string, filled: Filled) {
  const a = filled[cat] || [];
  for (let i = 0; i < 5; i++) if (!a[i]) return i;
  return -1;
}
export function answeredCount(filled: Filled) {
  let n = 0;
  for (const k in filled) for (let i = 0; i < 5; i++) if (filled[k]?.[i]) n++;
  return n;
}
export function makeEmptyAnswers(cats: string[]): Answers {
  const o: Answers = {};
  for (const c of cats) o[c] = [-1, -1, -1, -1, -1];
  return o;
}
export function makeEmptyFilled(cats: string[]): Filled {
  const o: Filled = {};
  for (const c of cats) o[c] = [false, false, false, false, false];
  return o;
}
export function hashChoice(key: string, salt: string) {
  let h = 2166136261;
  const s = key + "|" + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}
export function pickNextCatDeterministic(candidates: string[], ctx: object) {
  if (candidates.length <= 1) return candidates[0] || null;
  const h = hashChoice("C_NEXT", JSON.stringify(ctx));
  return candidates[h % candidates.length];
}
export function deriveCSeed(cats: string[]) {
  return String(hashChoice("C_SEED", cats.join(",")));
}
export function initialPair(cats: string[], cSeed: string): Pair {
  const idx = cats.length > 0 ? hashChoice("C_INIT", cSeed) % cats.length : 0;
  return { cat: cats[idx], qIdx: 0 };
}
export function coerceAnswersToDomain(
  cats: string[],
  answers: Answers,
  getType: (c: string, i: number) => QType
) {
  const out: Answers = {};
  for (const c of cats) {
    out[c] = [...(answers[c] || [-1, -1, -1, -1, -1])];
    for (let i = 0; i < 5; i++) {
      const t = getType(c, i);
      const mx = domainMax(t);
      const v = out[c][i];
      if (v === -1) continue;
      if (typeof v !== "number" || v < 0 || v > mx) out[c][i] = -1;
    }
  }
  return out;
}
export function validatePayload(
  cats: string[],
  answers: Answers,
  getType: (c: string, i: number) => QType
) {
  for (const c of cats) {
    const arr = answers[c] || [];
    if (arr.length !== 5)
      return { ok: false, focus: { cat: c, qIdx: 0 }, reason: "bad_length" };
    for (let i = 0; i < 5; i++) {
      const t = getType(c, i);
      const mx = domainMax(t);
      const v = arr[i];
      if (typeof v !== "number" || v < 0 || v > mx)
        return {
          ok: false,
          focus: { cat: c, qIdx: i },
          reason: "out_of_range",
        };
    }
  }
  return { ok: true, focus: { cat: cats[0], qIdx: 0 }, reason: "ok" };
}
export function nextPairAfterAnswer(
  state: CState,
  getType: (c: string, i: number) => QType,
  cur: Pair,
  ans: number
): Pair | null {
  const cats = state.cats;
  const answers = state.answers;
  const filled = state.filled;
  const cSeed = state.cSeed;
  const used: Filled = makeEmptyFilled(cats);
  used[cur.cat][cur.qIdx] = true;
  const doneCnt = answeredCount(filled);
  const total = cats.length * 5;
  if (doneCnt >= total) return null;
  const unsolvedCats = cats.filter((c) => getNextQIdx(c, filled) !== -1);
  const strong = isStrong(getType(cur.cat, cur.qIdx), ans);
  if (strong) {
    const remInCat = getNextQIdx(cur.cat, markUsed(filled, used));
    if (remInCat !== -1) return { cat: cur.cat, qIdx: remInCat };
    const remOther = cats.find(
      (c) => getNextQIdx(c, markUsed(filled, used)) !== -1
    );
    if (remOther) return { cat: remOther, qIdx: getNextQIdx(remOther, filled) };
  }
  const nextCandidates = unsolvedCats.filter((c) => c !== cur.cat);
  const nextCat = pickNextCatDeterministic(
    nextCandidates.length ? nextCandidates : unsolvedCats,
    {
      cSeed,
      cur,
      ans,
      doneCnt,
    }
  );
  if (!nextCat) return null;
  return { cat: nextCat, qIdx: getNextQIdx(nextCat, filled) };
}
function reconstructPlan(
  state: CState,
  getType: (c: string, i: number) => QType
) {
  const cats = state.cats;
  const answers = state.answers;
  const filled = state.filled;
  const cSeed = state.cSeed;
  const acc: Pair[] = [];
  const first = initialPair(cats, cSeed);
  acc.push(first);
  let cur: Pair | null = first;
  while (cur) {
    const v = answers[cur.cat]?.[cur.qIdx] ?? -1;
    if (v === -1) break;
    const nxt = nextPairAfterAnswer({ ...state }, getType, cur, v);
    if (!nxt) break;
    acc.push(nxt);
    cur = nxt;
  }
  const nxt = (() => {
    if (!cur) {
      const qi = getNextQIdx(first.cat, filled);
      if (qi !== -1) return { cat: first.cat, qIdx: qi };
      const any = cats.find((c) => getNextQIdx(c, filled) !== -1);
      if (!any) return null;
      return { cat: any, qIdx: getNextQIdx(any, filled) };
    }
    const v = answers[cur.cat]?.[cur.qIdx] ?? -1;
    return nextPairAfterAnswer({ ...state }, getType, cur, v);
  })();
  if (nxt) acc.push(nxt);
  return acc;
}

function markUsed(filled: Filled, used: Filled) {
  const o: Filled = {};
  for (const c in filled) {
    o[c] = [];
    for (let i = 0; i < 5; i++) o[c][i] = filled[c][i] || used[c][i];
  }
  return o;
}

export function initState(
  cats: string[],
  getType: (c: string, i: number) => QType,
  persisted?: Partial<CState>
): CState {
  const cSeed = persisted?.cSeed || deriveCSeed(cats);
  const baseAns = persisted?.answers || makeEmptyAnswers(cats);
  const baseFilled = persisted?.filled || makeEmptyFilled(cats);
  const answers = coerceAnswersToDomain(cats, baseAns, getType);
  const filled: Filled = {};
  for (const c of cats) {
    filled[c] = [false, false, false, false, false];
    for (let i = 0; i < 5; i++)
      filled[c][i] = answers[c][i] !== -1 && baseFilled[c]?.[i] === true;
  }
  let plan = Array.isArray(persisted?.plan) ? (persisted!.plan as Pair[]) : [];
  let step =
    typeof persisted?.step === "number"
      ? Math.max(0, Math.min(persisted!.step!, 15))
      : 0;
  const valid = (p: Pair) =>
    !!p &&
    cats.includes(p.cat) &&
    p.qIdx >= 0 &&
    p.qIdx < 5 &&
    filled[p.cat]?.[p.qIdx] === true;
  let ok = true;
  for (let i = 0; i < Math.min(step, plan.length); i++)
    if (!valid(plan[i])) {
      ok = false;
      break;
    }
  if (!ok || plan.length === 0) {
    plan = reconstructPlan(
      { cats, step: 0, answers, filled, plan: [], cSeed },
      getType
    );
    step = Math.min(answeredCount(filled), Math.max(0, plan.length - 1));
  } else {
    const rebuilt = reconstructPlan(
      { cats, step, answers, filled, plan, cSeed },
      getType
    );
    plan = rebuilt;
    step = Math.min(answeredCount(filled), Math.max(0, rebuilt.length - 1));
  }
  return { cats, step, answers, filled, plan, cSeed };
}

export function currentPair(state: CState) {
  return state.plan[state.step] || null;
}

export function selectValue(
  state: CState,
  getType: (c: string, i: number) => QType,
  val: number
): { state: CState; finished: boolean } {
  const pair = currentPair(state);
  if (!pair) return { state, finished: false };
  const t = getType(pair.cat, pair.qIdx);
  const mx = domainMax(t);
  if (typeof val !== "number" || val < 0 || val > mx)
    return { state: { ...state, error: "out_of_range" }, finished: false };
  const answers = {
    ...state.answers,
    [pair.cat]: [...state.answers[pair.cat]],
  };
  const filled = { ...state.filled, [pair.cat]: [...state.filled[pair.cat]] };
  answers[pair.cat][pair.qIdx] = val;
  filled[pair.cat][pair.qIdx] = true;
  const ac = answeredCount(filled);
  const total = state.cats.length * 5;
  if (ac >= total) {
    const plan = [...state.plan];
    const step = Math.min(total, plan.length - 1);
    return {
      state: { ...state, answers, filled, plan, step, error: undefined },
      finished: true,
    };
  }
  const next = nextPairAfterAnswer(
    { ...state, answers, filled },
    getType,
    pair,
    val
  );
  const plan = [...state.plan];
  const upto = Math.max(0, state.step);
  plan[upto] = pair;
  if (next) plan[upto + 1] = next;
  const step = next ? upto + 1 : upto;
  return {
    state: { ...state, answers, filled, plan, step, error: undefined },
    finished: false,
  };
}

export function prev(state: CState): CState {
  if (state.step <= 0 || state.plan.length === 0) return { ...state };
  const step = Math.max(0, state.step - 1);
  return { ...state, step };
}

export function ensureNextQuestion(
  state: CState,
  getType: (c: string, i: number) => QType
): CState {
  const total = state.cats.length * 5;
  const ac = answeredCount(state.filled);
  if (ac >= total) return state;
  const cur = currentPair(state);
  if (cur && !state.filled[cur.cat]?.[cur.qIdx]) return state;
  const last = state.plan[state.step - 1];
  if (!last) {
    const first = initialPair(state.cats, state.cSeed);
    const plan = [first];
    return { ...state, plan, step: 0 };
  }
  const v = state.answers[last.cat]?.[last.qIdx] ?? -1;
  if (v === -1) return state;
  const nxt = nextPairAfterAnswer(state, getType, last, v);
  if (!nxt) return state;
  const plan = [...state.plan];
  plan[state.step] = nxt;
  return { ...state, plan };
}

export function toPersist(base: any, state: CState) {
  const out = base ? { ...base } : {};
  out.cState = {
    cats: state.cats,
    step: state.step,
    answers: state.answers,
    filled: state.filled,
    plan: state.plan,
    cSeed: state.cSeed,
  };
  return out;
}
export function fromPersist(obj: any): Partial<CState> | undefined {
  const s = obj && obj.cState;
  if (!s) return undefined;
  return s;
}
export function shouldSubmit(state: CState) {
  const total = state.cats.length * 5;
  return answeredCount(state.filled) >= total;
}
export function validateBeforeSubmit(
  state: CState,
  getType: (c: string, i: number) => QType
) {
  return validatePayload(state.cats, state.answers, getType);
}
