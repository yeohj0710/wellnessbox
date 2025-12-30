import { NextRequest, NextResponse } from "next/server";

import { runPlayground } from "@/lib/agent-playground/run";
import { playgroundRequestSchema } from "@/lib/agent-playground/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const validation = playgroundRequestSchema.safeParse(body ?? {});

  if (!validation.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { message, mode, patternId } = validation.data;

  try {
    const payload = await runPlayground(message, mode, patternId);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
