import { NextRequest, NextResponse } from "next/server";

import { runPlayground } from "@/lib/agent-playground/run";
import { PlaygroundMode } from "@/lib/agent-playground/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = body?.message as string;
  const mode = body?.mode as PlaygroundMode;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (!mode || !["llm", "agent", "both"].includes(mode)) {
    return NextResponse.json({ error: "mode must be llm | agent | both" }, { status: 400 });
  }

  try {
    const payload = await runPlayground(message, mode);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
