import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { tokenFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const me = (
    await db.select().from(users).where(eq(users.id, auth.id)).limit(1)
  )[0];
  if (!me) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    user: {
      id: me.id,
      name: me.name,
      bio: me.bio,
      avatar: me.avatar,
      status: me.status,
      isOwner: me.isOwner,
      badges: me.badges,
    },
  });
}

export async function POST(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.bio === "string") updates.bio = body.bio.slice(0, 300);
  if (typeof body.avatar === "string") updates.avatar = body.avatar.slice(0, 500000);
  if (typeof body.status === "string") updates.status = body.status.slice(0, 30);

  const updated = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, auth.id))
    .returning();
  const me = updated[0];
  broadcast({
    type: "profile_update",
    payload: { name: me.name, avatar: me.avatar, status: me.status },
  });
  return Response.json({
    user: {
      id: me.id,
      name: me.name,
      bio: me.bio,
      avatar: me.avatar,
      status: me.status,
      isOwner: me.isOwner,
      badges: me.badges,
    },
  });
}
