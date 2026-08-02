import { db } from "@/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { tokenFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function GET(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.select().from(channels);
  // Hidden (phantom vault) channels only visible to owner
  const visible = auth.isOwner ? all : all.filter((c) => !c.hidden);
  return Response.json({ channels: visible });
}

export async function POST(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action;

  if (action === "join") {
    const code = (body.code || "").toString().toUpperCase().trim();
    const found = (
      await db.select().from(channels).where(eq(channels.code, code)).limit(1)
    )[0];
    if (!found) return Response.json({ error: "Channel not found" }, { status: 404 });
    return Response.json({ channel: found });
  }

  const name = (body.name || "").toString().slice(0, 40).trim();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });

  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const exists = (
      await db.select().from(channels).where(eq(channels.code, code)).limit(1)
    )[0];
    if (!exists) break;
    code = genCode();
  }

  const inserted = await db
    .insert(channels)
    .values({
      name,
      code,
      isPrivate: !!body.isPrivate,
      hidden: auth.isOwner ? !!body.hidden : false,
      createdBy: auth.name,
    })
    .returning();

  const ch = inserted[0];
  if (!ch.hidden) {
    broadcast({ type: "channel_created", payload: ch });
  }
  return Response.json({ channel: ch });
}
