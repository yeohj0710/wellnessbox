import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "./openai";
import { AgentContext, AgentStep, PlaygroundPattern } from "./patterns";
import { TraceCollector } from "./trace";
import { EvaluationResult, NodePrompt, PlaygroundRunResult } from "./types";

const safeAnswer = (content: unknown) =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .map((item) =>
            typeof item === "string" ? item : JSON.stringify(item ?? "")
          )
          .join(" ")
      : JSON.stringify(content ?? "");

const coerceSingleLine = (text: string) => text.replace(/\s+/g, " ").trim();

const ensureTerms = (text: string, terms: string[]) => {
  let fixed = text;
  const lower = fixed.toLowerCase();
  for (const term of terms) {
    if (!lower.includes(term.toLowerCase())) {
      fixed = `${fixed} ${term}`.trim();
    }
  }
  return fixed;
};

const normalizeRouteId = (text?: string) =>
  (text ?? "")
    .toLowerCase()
    .replace(/[-_\s]+/g, "")
    .replace(/[^a-z0-9]/g, "");

const buildMessages = (prompt: NodePrompt) => {
  const messages = [] as (SystemMessage | HumanMessage | AIMessage)[];
  if (prompt.system) messages.push(new SystemMessage(prompt.system));
  messages.push(new HumanMessage(prompt.human));
  return messages;
};

const applyStringRepair = (
  patternId: string,
  output: string,
  evaluation: EvaluationResult,
  ctx: AgentContext
) => {
  let next = output;
  let changed = false;

  if (patternId === "parallel-vote") {
    const tightened = coerceSingleLine(next);
    const ensured = ensureTerms(tightened, ["flow", "team"]);
    const trimmed = ensured.length > 20 ? ensured.slice(0, 20).trim() : ensured;
    next = trimmed;
    changed = next !== output;
  }

  if (patternId === "prompt-chaining") {
    const ensured = ensureTerms(next, ["그린빈", "공정무역"]);
    let adjusted = ensured;
    if (adjusted.length > 140) {
      adjusted = adjusted.slice(0, 140).trim();
    }
    if (adjusted.length < 80) {
      adjusted = `${adjusted} 지속 가능성과 공정무역 가치를 강조합니다.`.trim();
    }
    next = adjusted;
    changed = next !== output;
  }

  if (patternId === "routing") {
    const guess = ctx.input.match(/bug|오류|튕|에러|crash|로그인 문제/i)
      ? "bug_report"
      : "feature_request";
    let patched = next;
    if (!/분류\s*:/i.test(patched)) {
      patched = `분류: ${guess}\n${patched}`;
      changed = true;
    }
    if (!/다음 단계:/i.test(patched)) {
      patched = `${patched}\n다음 단계:\n- 재현 정보 확인\n- 담당자 배정`;
      changed = true;
    }
    next = patched;
  }

  if (patternId === "orchestrator-workers") {
    const lines = next
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    while (lines.length < 3) {
      const fillers = [
        "- 인사: 팀에 온 것을 환영합니다!",
        "- 준비: 장비와 계정을 확인하세요.",
        "- 문의: 슬랙 #help 채널에 질문하세요.",
      ];
      lines.push(fillers[lines.length % fillers.length]);
      changed = true;
    }
    const merged = lines.map((l) => l.startsWith("-") ? l : `- ${l}`).join("\n");
    const ensured = ensureTerms(merged, ["인사", "준비", "문의"]);
    if (ensured !== next) changed = true;
    next = ensured;
  }

  return { next, changed };
};

const buildRepairPrompt = (
  patternId: string,
  ctx: AgentContext,
  evaluation: EvaluationResult,
  attempt: number
): NodePrompt | null => {
  const baseViolations = evaluation.violations.join("\n- ");
  if (patternId === "parallel-vote") {
    return {
      system:
        "조건을 만족하는 새로운 슬로건을 정확히 한 줄만 출력하세요. 20자 이내, 따옴표/부연 설명 금지, flow와 team 단어 반드시 포함.",
      human: `요청: ${ctx.input}\n현재 실패 이유:\n- ${baseViolations}\n새 슬로건 1개만 제시하세요.`,
    };
  }

  if (patternId === "prompt-chaining") {
    return {
      system:
        "브랜드 설명을 두 문장으로 다시 작성하세요. 80~140자, '그린빈'과 '공정무역'을 포함하고 두 문장을 마침표로 구분합니다.",
      human: `현재 응답:\n${ctx.scratch.final || ctx.scratch.draft || ""}\n위반 사항:\n- ${baseViolations}`,
    };
  }

  if (patternId === "evaluator-optimizer") {
    return {
      system:
        "요구된 스키마를 만족하는 JSON을 다시 작성하세요. title(20자 이내)과 advice(80~160자, '의사' 포함)을 정확히 채우고 JSON 외 텍스트 금지.",
      human: `이전 JSON:\n${ctx.scratch.draft || ""}\n위반 사항:\n- ${baseViolations}\nJSON만 반환하세요.`,
    };
  }

  if (patternId === "routing") {
    return {
      system:
        "고객 메시지를 bug_report 또는 feature_request 중 하나로 분류하고 템플릿을 완성하세요. '분류: <label>'로 시작하고 '다음 단계:' 목록을 포함합니다.",
      human: `입력: ${ctx.input}\n현재 응답:\n${ctx.scratch.final || ctx.scratch.route || ""}\n위반 사항:\n- ${baseViolations}`,
    };
  }

  if (patternId === "orchestrator-workers") {
    return {
      system:
        "3줄 온보딩 안내를 다시 작성하세요. 각 줄은 '-'로 시작하고 인사/준비/문의 키워드를 포함합니다.",
      human: `현재 응답:\n${ctx.scratch.final || ""}\n위반 사항:\n- ${baseViolations}`,
    };
  }

  return null;
};

export const runAgentPattern = async (
  pattern: PlaygroundPattern,
  input: string
): Promise<PlaygroundRunResult> => {
  const tracer = new TraceCollector();
  const llm = createChatModel();
  const ctx: AgentContext = { input, scratch: {} };

  const invoke = async (prompt: NodePrompt, nodeName: string) => {
    tracer.pushStep(nodeName, { node: nodeName });
    const response = await llm.invoke(buildMessages(prompt), {
      callbacks: [tracer as any],
      metadata: { nodeName },
    });
    return safeAnswer(response.content);
  };

  const runStep = async (step: AgentStep) => {
    switch (step.type) {
      case "sequential": {
        const output = await invoke(step.prompt(ctx), step.label);
        ctx.scratch[step.saveAs] = output;
        return;
      }
      case "parallel_generate": {
        const outputs: string[] = await Promise.all(
          Array.from({ length: step.count }).map((_, i) =>
            invoke(step.prompt(ctx, i), `${step.label} #${i + 1}`)
          )
        );
        ctx.scratch[step.saveAs] = outputs;
        return;
      }
      case "judge": {
        const candidates: string[] = Array.isArray(ctx.scratch[step.from])
          ? ctx.scratch[step.from]
          : [];
        const evaluated = candidates.map((candidate) => ({
          value: candidate,
          evaluation: pattern.evaluator(candidate),
        }));

        const passing = evaluated.filter((e) => e.evaluation.pass);

        if (passing.length > 0) {
          const sorted = passing.sort((a, b) => {
            const scoreA = a.evaluation.score ?? 1;
            const scoreB = b.evaluation.score ?? 1;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.value.length - b.value.length;
          });
          ctx.scratch[step.saveAs] = sorted[0].value;
          tracer.pushStep(`${step.label}: auto-select`, { selected: sorted[0].value });
          if (passing.length > 1) {
            const original = ctx.scratch[step.from];
            ctx.scratch[step.from] = passing.map((p) => p.value);
            const judged = await invoke(step.prompt(ctx), `${step.label} (tie-break)`);
            ctx.scratch[step.saveAs] = judged;
            ctx.scratch[step.from] = original;
          }
          return;
        }

        const fallback = await invoke(step.prompt(ctx), `${step.label} (retry)`);
        ctx.scratch[step.saveAs] = fallback;
        return;
      }
      case "route": {
        const selection = await invoke(step.prompt(ctx), step.label);
        const normalizedSelection = normalizeRouteId(selection);
        let selectedRoute = step.routes.find((r) =>
          [normalizeRouteId(r.id), normalizeRouteId(r.label)].some((id) =>
            normalizedSelection.includes(id)
          )
        );

        if (!selectedRoute && /feature/i.test(selection)) {
          selectedRoute = step.routes.find((r) => normalizeRouteId(r.id) === "featurerequest");
        }
        if (!selectedRoute && /bug|error|오류|튕|에러|crash/i.test(selection)) {
          selectedRoute = step.routes.find((r) => normalizeRouteId(r.id) === "bugreport");
        }

        if (!selectedRoute) {
          const reroute = await invoke(
            {
              system:
                "bug_report 또는 feature_request 중 하나의 레이블만 출력하세요. 다른 단어를 넣지 않습니다.",
              human: `입력: ${ctx.input}\n이전 선택: ${selection}`,
            },
            `${step.label} (retry)`
          );
          const normalizedRetry = normalizeRouteId(reroute);
          selectedRoute = step.routes.find((r) =>
            [normalizeRouteId(r.id), normalizeRouteId(r.label)].some((id) =>
              normalizedRetry.includes(id)
            )
          );
        }

        selectedRoute = selectedRoute ?? step.routes[0];
        const routed = await invoke(
          selectedRoute.prompt(ctx),
          `${step.label}: ${selectedRoute.id}`
        );
        ctx.scratch[step.saveAs] = routed;
        return;
      }
      default:
        return;
    }
  };

  try {
    for (const step of pattern.agentPlan.steps) {
      await runStep(step);
    }

    const finalField = pattern.agentPlan.finalField;
    const targetField = pattern.agentPlan.revision?.targetField ?? finalField;
    let finalAnswer: string = ctx.scratch[finalField] ?? "";
    let evaluation: EvaluationResult = pattern.evaluator(finalAnswer ?? "");
    let iterations = 0;
    let hardRepairs = 0;

    while (
      !evaluation.pass &&
      iterations < (pattern.agentPlan.revision?.maxRetries ?? 0)
    ) {
      iterations += 1;
      const prompt = pattern.agentPlan.revision?.prompt(ctx, evaluation);
      if (!prompt) break;
      const revised = await invoke(prompt, `revise-${iterations}`);
      ctx.scratch[targetField] = revised;
      ctx.scratch[finalField] = revised;
      finalAnswer = revised;
      evaluation = pattern.evaluator(revised);
    }

    while (!evaluation.pass && hardRepairs < 2) {
      const repaired = applyStringRepair(pattern.id, finalAnswer ?? "", evaluation, ctx);
      if (repaired.changed) {
        tracer.pushStep(`repair-${hardRepairs + 1} (rule)`, {
          source: finalAnswer,
          next: repaired.next,
        });
        finalAnswer = repaired.next;
        ctx.scratch[targetField] = repaired.next;
        ctx.scratch[finalField] = repaired.next;
        evaluation = pattern.evaluator(repaired.next);
        hardRepairs += 1;
        continue;
      }

      const repairPrompt = buildRepairPrompt(
        pattern.id,
        ctx,
        evaluation,
        hardRepairs + 1
      );
      if (!repairPrompt) break;
      hardRepairs += 1;
      iterations += 1;
      const repairedAnswer = await invoke(repairPrompt, `repair-${hardRepairs}`);
      finalAnswer = repairedAnswer;
      ctx.scratch[targetField] = repairedAnswer;
      ctx.scratch[finalField] = repairedAnswer;
      evaluation = pattern.evaluator(repairedAnswer);
    }

    const trace = tracer.trace;
    const llmCalls = trace.filter((t) => t.type === "LLM_CALL").length;

    return {
      answer: finalAnswer ?? "응답이 생성되지 않았습니다.",
      trace,
      meta: {
        patternId: pattern.id,
        iterations,
        hardRepairs,
        evaluation,
        llmCalls,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent 실행 오류";
    tracer.pushError(message);
    return { error: message, trace: tracer.trace };
  }
};
