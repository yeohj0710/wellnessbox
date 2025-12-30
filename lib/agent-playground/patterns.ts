import { z } from "zod";

import { EvaluationResult, NodePrompt } from "./types";

export type AgentContext = {
  input: string;
  scratch: Record<string, any>;
};

export type AgentStep =
  | {
      id: string;
      type: "sequential";
      label: string;
      prompt: (ctx: AgentContext) => NodePrompt;
      saveAs: string;
    }
  | {
      id: string;
      type: "parallel_generate";
      label: string;
      count: number;
      prompt: (ctx: AgentContext, index: number) => NodePrompt;
      saveAs: string;
    }
  | {
      id: string;
      type: "judge";
      label: string;
      from: string;
      prompt: (ctx: AgentContext) => NodePrompt;
      saveAs: string;
    }
  | {
      id: string;
      type: "route";
      label: string;
      prompt: (ctx: AgentContext) => NodePrompt;
      routes: { id: string; label: string; prompt: (ctx: AgentContext) => NodePrompt }[];
      saveAs: string;
    };

export type AgentPlan = {
  steps: AgentStep[];
  finalField: string;
  revision?: {
    targetField?: string;
    maxRetries: number;
    prompt: (ctx: AgentContext, evaluation: EvaluationResult) => NodePrompt;
  };
};

export type PlaygroundPattern = {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
  expectedOutputSchema?: z.ZodTypeAny;
  evaluator: (output: string) => EvaluationResult;
  agentPlan: AgentPlan;
};

const sentenceCount = (text: string) => {
  const normalized = text.replace(/\n+/g, ".");
  return normalized
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean).length;
};

const lineCount = (text: string) =>
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean).length;

const includesAll = (text: string, terms: string[]) =>
  terms.every((term) => text.toLowerCase().includes(term.toLowerCase()));

const withinLength = (text: string, min: number, max: number) =>
  text.length >= min && text.length <= max;

const parseJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};

const patterns: PlaygroundPattern[] = [
  {
    id: "prompt-chaining",
    name: "Prompt chaining",
    description: "추출→구성→초안→최종 다단계 서술", 
    defaultPrompt:
      "지속 가능한 커피 브랜드 '그린빈'을 2문장으로 소개해주세요. 공정무역과 재활용 포장을 강조하고 80~140자 사이로 작성합니다.",
    evaluator: (output) => {
      const violations: string[] = [];
      if (!includesAll(output, ["그린빈", "공정무역"])) {
        violations.push("브랜드명 또는 공정무역 언급이 없습니다.");
      }
      const sentences = sentenceCount(output);
      const lines = lineCount(output);
      if (!(sentences === 2 || lines === 2)) {
        violations.push(`문장/줄 수가 2개가 아닙니다(문장 ${sentences}, 줄 ${lines}).`);
      }
      if (!withinLength(output, 80, 140)) {
        violations.push("길이가 80~140자 범위를 벗어났습니다.");
      }
      return { pass: violations.length === 0, score: violations.length ? 0 : 1, violations };
    },
    agentPlan: {
      steps: [
        {
          id: "extract",
          type: "sequential",
          label: "요구사항 추출",
          saveAs: "facts",
          prompt: (ctx) => ({
            system:
              "주어진 요구사항에서 필수 요소를 bullet으로만 추출하세요. 불필요한 서술을 넣지 말고 핵심 단어를 명시합니다.",
            human: `요구사항: ${ctx.input}`,
          }),
        },
        {
          id: "compose",
          type: "sequential",
          label: "구성 계획",
          saveAs: "outline",
          prompt: (ctx) => ({
            system:
              "추출한 사실을 기반으로 2문장 구조 계획을 제시하세요. 각 문장은 포함할 키워드와 길이 목표를 적습니다.",
            human: `필수 요소:\n${ctx.scratch.facts}`,
          }),
        },
        {
          id: "draft",
          type: "sequential",
          label: "초안 작성",
          saveAs: "draft",
          prompt: (ctx) => ({
            system:
              "계획에 따라 한국어 초안을 2문장으로 작성하세요. 각 문장은 마침표로 끝내고 불필요한 인용부호 없이 작성합니다.",
            human: `계획:\n${ctx.scratch.outline}`,
          }),
        },
        {
          id: "finalize",
          type: "sequential",
          label: "길이/톤 조정",
          saveAs: "final",
          prompt: (ctx) => ({
            system:
              "초안을 80~140자로 다듬고 필수 키워드를 유지하며 부드럽게 연결하세요. 정확히 2문장을 유지합니다.",
            human: `초안:\n${ctx.scratch.draft}`,
          }),
        },
      ],
      finalField: "final",
      revision: {
        maxRetries: 3,
        prompt: (ctx, evaluation) => ({
          system:
            "검증 결과를 반영하여 동일한 형식(2문장, 80~140자)으로 수정하세요. 마침표로 문장을 구분하고 불필요한 수식은 제거합니다.",
          human: `현재 응답:\n${ctx.scratch.final}\n위반 사항:\n- ${evaluation.violations.join(
            "\n- "
          )}`,
        }),
      },
    },
  },
  {
    id: "evaluator-optimizer",
    name: "Evaluator → Optimizer",
    description: "검증-수정 반복 루프",
    defaultPrompt:
      "다음 사용자 요청에 대한 답변을 JSON으로 작성하세요. title(20자 이내)과 advice(80~160자, '의사' 단어 포함)가 필요합니다. 입력: 최근 며칠간 두통이 자주 발생하고 수면이 부족합니다.",
    expectedOutputSchema: z.object({
      title: z.string().max(20),
      advice: z.string().min(80).max(160),
    }),
    evaluator: (output) => {
      const violations: string[] = [];
      const json = parseJson(output);
      if (!json) {
        return {
          pass: false,
          score: 0,
          violations: ["JSON 형식이 아닙니다."],
        };
      }
      if (typeof json.title !== "string" || json.title.length > 20) {
        violations.push("title이 20자 이하여야 합니다.");
      }
      if (
        typeof json.advice !== "string" ||
        !withinLength(json.advice, 80, 160)
      ) {
        violations.push("advice는 80~160자여야 합니다.");
      }
      if (!includesAll(json.advice || "", ["의사"])) {
        violations.push("advice에 '의사' 단어가 포함되어야 합니다.");
      }
      return { pass: violations.length === 0, score: violations.length ? 0 : 1, violations, parsed: json };
    },
    agentPlan: {
      steps: [
        {
          id: "plan",
          type: "sequential",
          label: "제약 요약",
          saveAs: "constraints",
          prompt: (ctx) => ({
            system:
              "요구된 JSON 스키마와 검증 조건을 bullet으로 요약하세요. 필드 이름과 길이 제약을 명확히 기재합니다.",
            human: `요청: ${ctx.input}`,
          }),
        },
        {
          id: "generate",
          type: "sequential",
          label: "초안 JSON",
          saveAs: "draft",
          prompt: (ctx) => ({
            system:
              "요약된 제약을 모두 만족하는 JSON만 출력하세요. 추가 설명 금지. 따옴표, 줄바꿈 등 JSON 이외의 텍스트를 넣지 마세요.",
            human: `제약:\n${ctx.scratch.constraints}\n응답은 JSON 한 덩어리로만 출력합니다.`,
          }),
        },
      ],
      finalField: "draft",
      revision: {
        maxRetries: 4,
        targetField: "draft",
        prompt: (ctx, evaluation) => ({
          system: "검증 실패 항목을 모두 수정한 새로운 JSON만 출력하세요.",
          human: `이전 JSON:\n${ctx.scratch.draft}\n위반 사항:\n- ${evaluation.violations.join(
            "\n- "
          )}\nJSON만 제공합니다.`,
        }),
      },
    },
  },
  {
    id: "parallel-vote",
    name: "Parallel + vote",
    description: "다중 후보 생성 후 투표/선정",
    defaultPrompt:
      "'flow'와 'team'을 담은 20자 이하 한국어 제품 슬로건을 제안하세요. 가장 좋은 한 가지를 고릅니다.",
    evaluator: (output) => {
      const violations: string[] = [];
      if (!withinLength(output, 4, 20)) {
        violations.push("20자 이내여야 합니다.");
      }
      if (!includesAll(output, ["flow", "team"])) {
        violations.push("flow와 team 단어를 모두 포함해야 합니다.");
      }
      return { pass: violations.length === 0, score: violations.length ? 0.5 : 1, violations };
    },
    agentPlan: {
      steps: [
        {
          id: "parallel_generate",
          type: "parallel_generate",
          label: "후보 3개 생성",
          count: 3,
          saveAs: "candidates",
          prompt: (ctx, index) => ({
            system:
              "제안 슬로건을 한국어 한 줄로 작성하세요. 따옴표, 번호, 부가 설명 없이 20자 이내로 작성하고 'flow'와 'team'을 모두 포함해야 합니다.",
            human: `요청: ${ctx.input}\n후보 ${index + 1}를 다른 어휘로 제시하세요. 형식: 슬로건만 한 줄.`,
          }),
        },
        {
          id: "judge",
          type: "judge",
          label: "평가/선정",
          from: "candidates",
          saveAs: "final",
          prompt: (ctx) => ({
            system:
              "후보 중 조건을 지키지 않은 항목은 제외하세요. flow와 team이 모두 포함되고 20자 이내인 후보 중 가장 짧고 자연스러운 것을 선택해 슬로건만 그대로 출력하세요. 모든 후보가 조건을 어길 경우 조건을 만족하는 새 슬로건을 1개 생성하여 출력합니다.",
            human: `후보 목록:\n${ctx.scratch.candidates
              .map((c: string, i: number) => `${i + 1}. ${c}`)
              .join("\n")}`,
          }),
        },
      ],
      finalField: "final",
      revision: {
        maxRetries: 2,
        prompt: (ctx, evaluation) => ({
          system:
            "선정된 슬로건을 제약에 맞게 20자 이내로 수정하세요. 반드시 flow와 team을 포함하고 한 줄만 출력합니다.",
          human: `현재 슬로건: ${ctx.scratch.final}\n위반 사항:\n- ${evaluation.violations.join(
            "\n- "
          )}`,
        }),
      },
    },
  },
  {
    id: "orchestrator-workers",
    name: "Orchestrator → workers",
    description: "역할 분업 후 합성",
    defaultPrompt:
      "신입 팀원의 첫 주 온보딩 안내를 3줄로 작성해 주세요. 친근한 인사, 준비물 체크, 도움 채널을 포함합니다.",
    evaluator: (output) => {
      const violations: string[] = [];
      const lines = output
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const sentenceOrLineCount = Math.max(sentenceCount(output), lines.length);
      if (sentenceOrLineCount < 3) {
        violations.push("3줄 이상이어야 합니다.");
      }
      if (!includesAll(output, ["인사", "준비", "문의"])) {
        violations.push("인사/준비/문의 키워드를 포함해야 합니다.");
      }
      return { pass: violations.length === 0, score: violations.length ? 0.6 : 1, violations };
    },
    agentPlan: {
      steps: [
        {
          id: "orchestrate",
          type: "sequential",
          label: "작업 계획",
          saveAs: "plan",
          prompt: (ctx) => ({
            system:
              "필수 요소를 세 가지 역할로 나누어 간단한 TODO 리스트를 작성하세요. 각 TODO는 8단어 이내로 간결히 서술합니다.",
            human: `요청: ${ctx.input}`,
          }),
        },
        {
          id: "worker_researcher",
          type: "sequential",
          label: "리서처 요약",
          saveAs: "research",
          prompt: (ctx) => ({
            system:
              "친근한 인사와 준비물 관련 짧은 bullet을 작성하세요. 각 bullet은 12단어 이하로 유지합니다.",
            human: `작업 계획:\n${ctx.scratch.plan}`,
          }),
        },
        {
          id: "worker_writer",
          type: "sequential",
          label: "라이터 작성",
          saveAs: "draft",
          prompt: (ctx) => ({
            system:
              "리서치 결과를 기반으로 3줄 메시지를 작성하세요. 각 줄은 '-'로 시작하고 인사/준비/문의 맥락이 각각 드러나야 합니다.",
            human: `리서치 메모:\n${ctx.scratch.research}`,
          }),
        },
        {
          id: "merge",
          type: "sequential",
          label: "합성/마감",
          saveAs: "final",
          prompt: (ctx) => ({
            system:
              "각 줄에 인사, 준비, 문의 키워드가 드러나도록 다듬고 3줄 형식을 유지하세요. 불필요한 공백이나 인용부호는 제거합니다.",
            human: `초안:\n${ctx.scratch.draft}`,
          }),
        },
      ],
      finalField: "final",
      revision: {
        maxRetries: 1,
        prompt: (ctx, evaluation) => ({
          system:
            "누락된 키워드를 추가하고 3줄 형식을 유지하면서 응답을 수정하세요.",
          human: `현재 응답:\n${ctx.scratch.final}\n위반 사항:\n- ${evaluation.violations.join(
            "\n- "
          )}`,
        }),
      },
    },
  },
  {
    id: "routing",
    name: "Routing",
    description: "분류 후 템플릿 출력",
    defaultPrompt:
      "고객 메시지를 bug_report 또는 feature_request로 분류하고 템플릿에 맞춰 답변하세요. 입력: 앱이 자꾸 튕기고 로그인 오류가 발생합니다.",
    evaluator: (output) => {
      const violations: string[] = [];
      if (!/분류\s*:\s*(bug_report|feature_request)/i.test(output)) {
        violations.push("분류: bug_report | feature_request 형식을 포함해야 합니다.");
      }
      if (!/다음 단계:/i.test(output)) {
        violations.push("'다음 단계:' 섹션이 필요합니다.");
      }
      return { pass: violations.length === 0, score: violations.length ? 0.4 : 1, violations };
    },
    agentPlan: {
      steps: [
        {
          id: "route",
          type: "route",
          label: "분류 결정",
          saveAs: "route",
          prompt: (ctx) => ({
            system:
              "입력을 bug_report 또는 feature_request 중 하나로만 분류하고 해당 레이블만 정확히 출력하세요. 다른 단어나 설명은 금지합니다.",
            human: `메시지: ${ctx.input}`,
          }),
          routes: [
            {
              id: "bug_report",
              label: "버그 템플릿",
              prompt: (ctx) => ({
                system:
                  "버그 보고 템플릿에 맞춰 짧게 작성합니다. '분류: bug_report'로 시작하고 '다음 단계:' 목록을 제공합니다. 라벨과 섹션 제목을 그대로 사용합니다.",
                human: `사용자 메시지: ${ctx.input}`,
              }),
            },
            {
              id: "feature_request",
              label: "피처 요청 템플릿",
              prompt: (ctx) => ({
                system:
                  "요청 템플릿에 맞춰 작성합니다. '분류: feature_request'로 시작하고 '다음 단계:' 목록을 제공합니다. 라벨과 섹션 제목을 그대로 사용합니다.",
                human: `사용자 메시지: ${ctx.input}`,
              }),
            },
          ],
        },
        {
          id: "final",
          type: "sequential",
          label: "템플릿 출력",
          saveAs: "final",
          prompt: (ctx) => ({
            system: "선택된 템플릿 결과를 그대로 재출력하세요.",
            human: `${ctx.scratch.route}`,
          }),
        },
      ],
      finalField: "final",
      revision: {
        maxRetries: 1,
        prompt: (ctx, evaluation) => ({
          system: "템플릿을 유지하되 누락된 섹션을 보완하세요.",
          human: `현재 응답:\n${ctx.scratch.final}\n위반 사항:\n- ${evaluation.violations.join(
            "\n- "
          )}`,
        }),
      },
    },
  },
];

export const patternSummaries = patterns.map((pattern) => ({
  id: pattern.id,
  name: pattern.name,
  description: pattern.description,
  defaultPrompt: pattern.defaultPrompt,
}));

export const getPattern = (patternId?: string) =>
  patterns.find((p) => p.id === patternId) ?? patterns[0];

export { patterns };
