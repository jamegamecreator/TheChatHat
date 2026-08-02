import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { tokenFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const channelId = url.searchParams.get("channel") || "global";

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.channelId, channelId))
    .orderBy(desc(messages.createdAt))
    .limit(200);

  return Response.json({ messages: rows.reverse() });
}

export async function POST(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const me = (
    await db.select().from(users).where(eq(users.id, auth.id)).limit(1)
  )[0];
  if (!me || me.banned) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await req.json();
  const channelId = body.channelId || "global";
  const content = (body.content || "").toString().slice(0, 4000);
  const type = body.type || "text";
  const meta = body.meta || {};
  const unlockAt = body.unlockAt ? new Date(body.unlockAt) : null;

  if (!content && type === "text") {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  const inserted = await db
    .insert(messages)
    .values({
      channelId,
      userId: me.id,
      name: me.name,
      content,
      type,
      meta,
      unlockAt,
    })
    .returning();

  const msg = { ...inserted[0], badges: me.badges, isOwner: me.isOwner, avatar: me.avatar };

  // Shadowbanned users: message saved but only broadcast back to themselves
  if (!me.shadowbanned) {
    broadcast({ type: "message", payload: msg, channelId });
  }

  return Response.json({ message: msg });
}
