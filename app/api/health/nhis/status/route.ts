import { runNhisStatusGetAuthedRoute } from "@/lib/server/hyphen/status-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = runNhisStatusGetAuthedRoute;
