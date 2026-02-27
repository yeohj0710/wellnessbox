import "server-only";

import { NextResponse } from "next/server";
import { runPlayground } from "@/lib/agent-playground/run";
import { playgroundRequestSchema } from "@/lib/agent-playground/types";

const PLAYGROUND_INVALID_REQUEST_ERROR = "invalid request";

export async function runAgentPlaygroundPostRoute(req: Request) {
  const body = await req.json().catch(() => null);
  const validation = playgroundRequestSchema.safeParse(body ?? {});

  if (!validation.success) {
    return NextResponse.json({ error: PLAYGROUND_INVALID_REQUEST_ERROR }, { status: 400 });
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
