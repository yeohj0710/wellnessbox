import { NextResponse, type NextRequest } from "next/server";
import type { AiExperimentEventName } from "@/lib/ai-experiments/config";
import { resolveActorForRequest } from "@/lib/server/actor";
import { trackAiExperimentEvent } from "@/lib/ai-experiments/service";

function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function applyActorCookie(response: NextResponse, actor: Awaited<ReturnType<typeof resolveActorForRequest>>) {
  if (actor.cookieToSet) {
    response.cookies.set(actor.cookieToSet);
  }
  return response;
}

export async function runAiExperimentTrackRoute(req: NextRequest) {
  try {
    const body = await req.json();
    const experimentKey =
      typeof body?.experimentKey === "string" ? body.experimentKey.trim() : "";
    const eventName =
      typeof body?.eventName === "string" ? body.eventName.trim() : "";
    const surface = typeof body?.surface === "string" ? body.surface.trim() : "";
    const route = typeof body?.route === "string" ? body.route.trim() : "";
    const variantKey =
      typeof body?.variantKey === "string" ? body.variantKey.trim() : null;
    const sessionKey =
      typeof body?.sessionKey === "string" ? body.sessionKey.trim() : null;

    if (!experimentKey) return badRequest("experimentKey is required");
    if (!eventName) return badRequest("eventName is required");

    const actor = await resolveActorForRequest(req, { intent: "write" });
    const result = await trackAiExperimentEvent({
      actor,
      experimentKey,
      eventName: eventName as AiExperimentEventName,
      surface: surface || null,
      route: route || null,
      variantKey,
      sessionKey,
      payload: body?.payload,
    });

    return applyActorCookie(
      NextResponse.json(
        {
          ok: result.ok,
          tracked: result.tracked,
          variantKey: result.variantKey,
        },
        {
          headers: { "Cache-Control": "no-store" },
        }
      ),
      actor
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
