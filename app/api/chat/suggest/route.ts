import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/ai/models";
import { CATEGORY_LABELS } from "@/lib/categories";

export const runtime = "nodejs";

function ensureEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set`);
  return v;
}
function trimText(s: any, n: number) {
  const t = typeof s === "string" ? s : JSON.stringify(s || "");
  return t.length > n ? t.slice(0, n) : t;
}
function hashStr(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[\s\-_/·.,*~`'"()[\]]+/g, "")
    .replace(/ⓒ/g, "c");
}
function hasBatchim(word: string) {
  if (!word) return false;
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return false;
  return (ch - 0xac00) % 28 !== 0;
}
function josa(word: string, pair: "은/는" | "이/가" | "을/를" | "와/과") {
  const [a, b] = pair.split("/");
  return word + (hasBatchim(word) ? a : b);
}

const KNOWN_TOPICS: string[] = Object.values(CATEGORY_LABELS);

function extractTopicFromKnown(text: string): string | null {
  const tn = norm(text);
  let best: { pretty: string; pos: number } | null = null;
  for (const label of KNOWN_TOPICS) {
    const base = label.replace(/\s*\(.*?\)\s*/g, "").trim();
    const cand = [label, base].filter(Boolean);
    for (const c of cand) {
      const p = tn.indexOf(norm(c));
      if (p >= 0 && (best === null || p < best.pos))
        best = { pretty: label, pos: p };
    }
  }
  return best?.pretty || null;
}

async function extractTopicByAI(
  apiKey: string,
  text: string
): Promise<string | null> {
  const topics = KNOWN_TOPICS.join(", ");
  const payload = {
    model: await getDefaultModel(),
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 64,
    messages: [
      {
        role: "system",
        content:
          '너는 분류기야. 사용자의 마지막 AI 응답과 맥락을 보고 아래 리스트 중 가장 맞는 1개 주제를 고른다. 결과는 JSON 객체 {"topic":"라벨"}만. 리스트에 없으면 {"topic":"일반"}.',
      },
      { role: "user", content: `주제 후보: [${topics}]\n\n텍스트:\n${text}` },
    ],
  };
  const resp = await callOpenAI(apiKey, payload, 8000);
  if (!resp.ok) return null;
  const js = await resp.json().catch(() => null);
  const content = js?.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(content);
    const topic =
      typeof parsed?.topic === "string" ? parsed.topic.trim() : null;
    if (topic && KNOWN_TOPICS.includes(topic)) return topic;
    return null;
  } catch {
    return null;
  }
}

const FALLBACK_TEMPLATES: ((t: string) => string)[] = [
  (t) => `${t}의 용법에 대해 알려주세요.`,
  (t) => `${josa(t, "와/과")} 다른 영양제를 같이 먹을 때 주의할 점이 있나요?`,
  (t) => `${josa(t, "은/는")} 언제 먹는 영양제인가요?`,
  (t) => `${josa(t, "을/를")} 먹을 때 주의할 점이나 피해야 할 상황이 있을까요?`,
  (t) => `${t}랑 같이 먹으면 좋은 성분·조합을 추천해 주세요.`,
  (t) => `${t} 제품을 가성비 좋게 고르는 기준을 알려주세요.`,
];

function dynamicFallback(text: string, topicHint?: string | null): string[] {
  const topic = topicHint || extractTopicFromKnown(text) || "추천 영양제";
  const seed = hashStr(topic + "|" + text);
  const i = seed % FALLBACK_TEMPLATES.length;
  const j =
    (i + 2 + ((seed >> 3) % (FALLBACK_TEMPLATES.length - 1))) %
    FALLBACK_TEMPLATES.length;
  return [FALLBACK_TEMPLATES[i](topic), FALLBACK_TEMPLATES[j](topic)];
}

function isAssistantDirected(s: string) {
  const bad =
    /(어떤|어떻게|무엇을).*(하시나요|하고 계신가요)|있으신가요|하셨나요|느끼시나요|드시나요|드세요\?|하시겠어요\?|계신가요/;
  const good =
    /(추천|설명|알려|정리|비교|조합|설계|우선순위|용량|타이밍|복용법|상호작용|부작용|대안|브랜드|제품|가이드|표로|정리해|체크|스케줄|휴지기|제형|라벨|관리|모니터링|루틴)/;
  if (bad.test(s)) return false;
  return good.test(s);
}

function topLabelsFromAssessSummary(
  summary: any
): Array<{ label: string; percent?: number }> {
  if (!Array.isArray(summary)) return [];
  const out: Array<{ label: string; percent?: number }> = [];
  for (const s of summary.slice(0, 3)) {
    if (typeof s !== "string") continue;
    const m = s.match(/^(.+?)\s+([\d.]+)%$/);
    if (m) out.push({ label: m[1], percent: parseFloat(m[2]) });
    else out.push({ label: s });
  }
  return out;
}

function buildContextBrief(body: any) {
  const parts: string[] = [];
  const p = body?.profile || null;
  if (p) {
    const ps: string[] = [];
    if (p.sex === "male") ps.push("남성");
    else if (p.sex === "female") ps.push("여성");
    if (typeof p.age === "number") ps.push(`${p.age}세`);
    if (Array.isArray(p.goals) && p.goals.length)
      ps.push(`목표:${p.goals.slice(0, 2).join(",")}`);
    if (Array.isArray(p.conditions) && p.conditions.length)
      ps.push(`질환:${p.conditions.slice(0, 2).join(",")}`);
    if (Array.isArray(p.medications) && p.medications.length)
      ps.push(`약:${p.medications.slice(0, 2).join(",")}`);
    if (ps.length) parts.push(`프로필 ${ps.join(" · ")}`);
  }
  const assessTop = topLabelsFromAssessSummary(body?.assessResult?.summary);
  if (assessTop.length) {
    const t = assessTop
      .map(
        (x) =>
          `${x.label}${x.percent != null ? ` ${x.percent.toFixed(1)}%` : ""}`
      )
      .join(", ");
    parts.push(`정밀검사 상위 ${t}`);
  }
  const quickTop = Array.isArray(body?.checkAiResult?.labels)
    ? body.checkAiResult.labels.slice(0, 3)
    : [];
  if (quickTop.length) parts.push(`빠른검사 상위 ${quickTop.join(", ")}`);
  const orders = Array.isArray(body?.orders) ? body.orders : [];
  if (orders.length && Array.isArray(orders[0]?.items)) {
    const names = orders[0].items
      .map(
        (it: any) =>
          it?.name ??
          it?.productName ??
          it?.product?.name ??
          it?.label ??
          it?.title ??
          it?.sku ??
          null
      )
      .filter(Boolean);
    const uniq = Array.from(new Set(names)).slice(0, 3);
    if (uniq.length) parts.push(`최근 주문 ${uniq.join(", ")}`);
  }
  return trimText(parts.join(" | "), 600);
}

function buildHistoryText(msgs: any[]) {
  if (!Array.isArray(msgs) || !msgs.length) return "";
  const lines = msgs
    .slice(-6)
    .map(
      (m) =>
        `${m.role === "user" ? "사용자" : "AI"}: ${trimText(
          m.content || "",
          300
        )}`
    );
  return trimText(lines.join("\n"), 1200);
}

async function callOpenAI(apiKey: string, payload: any, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    return r;
  } catch (e) {
    clearTimeout(to);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = ensureEnv("OPENAI_KEY");
    const body = await req.json().catch(() => ({}));
    const text = trimText(body?.text || "", 1600);
    const countRaw = Number(body?.count);
    const count = Number.isFinite(countRaw)
      ? Math.min(Math.max(countRaw, 1), 2)
      : 2;

    const historyText = buildHistoryText(body?.recentMessages || []);
    const contextBrief = buildContextBrief(body || {});
    const topicBase = [text, historyText, contextBrief]
      .filter(Boolean)
      .join(" ");
    let topic: string | null = extractTopicFromKnown(topicBase);
    if (!topic) {
      try {
        topic = await extractTopicByAI(apiKey, topicBase);
      } catch {
        topic = null;
      }
    }

    const avoidPhrases =
      '다음 표현은 사용하지 말 것: "1일 권장량과 섭취 타이밍", "함께 먹기 좋은 조합/피해야 할 성분"';
    const hint = topic ? `주제 힌트: ${topic}\n` : "";
    const historyBlock = historyText
      ? `최근 대화 맥락:\n${historyText}\n\n`
      : "";
    const contextBlock = contextBrief
      ? `사용자 컨텍스트 요약:\n${contextBrief}\n\n`
      : "";

    const prompt = `${historyBlock}${contextBlock}직전 어시스턴트 응답:
${text}

${hint}아래 조건을 만족하는 문장 ${count}개를 생성하세요. 이 문장들은 "사용자"가 "상담사 AI"에게 이어서 던질 후속 질문입니다.
- 직전 응답의 핵심 주제를 우선 연결
- 최근 대화 맥락(검사 결과, 목표/상태, 최근 주문·사용 성분, 이미 언급된 다른 영양제)을 근거로 자연스럽게 주제 확장 가능
- 확장 시에도 이전 흐름과 논리적으로 이어질 것
- 한국어 존댓말(~요), 18~50자
- 예/아니오로 끝나지 않음
- 사용자의 현재 상태를 캐묻는 표현 금지(예: "~하시나요?" 금지)
- ${
      count >= 2
        ? "두 질문은 서로 다른 유형을 고르기: [용량/타이밍], [상호작용], [대안·비교], [품질·제형], [스케줄링], [부작용/모니터링], [예산·가성비] 중에서 선택"
        : "유형은 위 목록에서 하나 선택"
    }
- ${avoidPhrases}
- 출력은 JSON 객체 {"suggestions":[...]}만 허용

좋은 예: ["밀크씨슬은 흡수율 좋은 제형과 라벨 체크 포인트가 뭐예요?", "아르기닌은 운동·수면 루틴에 맞춰 언제 복용하는 게 좋아요?"]
나쁜 예: ["스트레스 완화를 위해 어떤 방법을 시도해 보셨나요?", "수면 개선을 위해 무엇을 하고 계신가요?"]`;

    const payload = {
      model: body?.model || (await getDefaultModel()),
      messages: [
        {
          role: "system",
          content:
            "당신은 건강기능식품 상담에서 사용자가 챗봇에게 던질 자연스럽고 수준 높은 후속 질문을 생성합니다. 반드시 JSON 객체만 출력하세요.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 220,
      response_format: { type: "json_object" },
      n: 3,
    };

    let suggestions: string[] = [];
    let resp = await callOpenAI(apiKey, payload);
    if (!resp.ok) resp = await callOpenAI(apiKey, payload, 14000);

    if (resp.ok) {
      const json = await resp.json().catch(() => null);
      const choices = json?.choices || [];
      const pool: string[] = [];
      for (const ch of choices) {
        const content = ch?.message?.content || "";
        try {
          const parsed = JSON.parse(content);
          const arr = Array.isArray(parsed?.suggestions)
            ? parsed.suggestions
            : [];
          for (const s of arr) if (typeof s === "string") pool.push(s.trim());
        } catch {}
      }
      const uniq = Array.from(new Set(pool))
        .filter(
          (s) =>
            s.length >= 18 &&
            s.length <= 50 &&
            isAssistantDirected(s) &&
            !/1일\s*권장량과\s*섭취\s*타이밍|함께\s*먹기\s*좋은\s*조합\/피해야\s*할\s*성분/.test(
              s
            )
        )
        .slice(0, count);
      suggestions = uniq;
    }

    if (suggestions.length !== count)
      suggestions = dynamicFallback(topicBase, topic).slice(0, count);

    if (suggestions.length < count) {
      const fb = dynamicFallback(topicBase, topic);
      while (suggestions.length < count && fb.length) {
        const c = fb.shift()!;
        if (!suggestions.includes(c)) suggestions.push(c);
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ suggestions: dynamicFallback("", null) }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
