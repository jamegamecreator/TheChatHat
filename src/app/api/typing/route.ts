import { tokenFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const channelId = body.channelId || "global";
  broadcast({
    type: "typing",
    payload: { name: auth.name, typing: !!body.typing },
    channelId,
  });
  return Response.json({ ok: true });
}
