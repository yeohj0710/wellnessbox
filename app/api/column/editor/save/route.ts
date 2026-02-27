import { runColumnEditorSaveRoute } from "@/lib/server/column-editor-save-route";
import { requireAdminSession } from "@/lib/server/route-auth";

export async function POST(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;
  return runColumnEditorSaveRoute(req);
}
