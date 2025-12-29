import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "@/lib/demo/openai";
import { TraceEvent, LlmTestResponse } from "@/lib/demo/types";

export const runtime = "nodejs";

const preview = (text: string, max = 200) => (text.length > max ? `${text.slice(0, max)}...` : text);

export async function POST(req: NextRequest) {
  const start = Date.now();
  const body = await req.json();
  const message = body?.message as string;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const model = createChatModel();
  const response = await model.invoke([
    new SystemMessage("질문에 간단히 답변하세요."),
    new HumanMessage(message),
  ]);

  const answer = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  const trace: TraceEvent[] = [
    {
      type: "LLM_CALL",
      ms: Date.now() - start,
      inputPreview: preview(message),
      outputPreview: preview(answer),
    },
  ];

  const payload: LlmTestResponse = { answer, trace };
  return NextResponse.json(payload);
}
