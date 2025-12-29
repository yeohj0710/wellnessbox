import { NextRequest, NextResponse } from "next/server";

import { runAgenticToolLoopV2 } from "@/lib/demo/agent/agenticLoopV2";
import { AgentTestResponse } from "@/lib/demo/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message as string;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const result = await runAgenticToolLoopV2(message);
    const payload: AgentTestResponse = { ...result };
    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
