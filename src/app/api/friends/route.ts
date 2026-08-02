import { db } from "@/db";
import { friends, users } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { tokenFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(friends)
    .where(or(eq(friends.requester, auth.name), eq(friends.addressee, auth.name)));

  const allUsers = await db.select().from(users);
  const dir = allUsers.map((u) => ({
    name: u.name,
    avatar: u.avatar,
    status: u.status,
    isOwner: u.isOwner,
  }));

  return Response.json({ friends: rows, users: dir });
}

export async function POST(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const action = body.action;
  const target = (body.target || "").toString().trim();

  if (action === "add") {
    if (!target || target === auth.name)
      return Response.json({ error: "Invalid target" }, { status: 400 });
    const exists = (
      await db
        .select()
        .from(friends)
        .where(
          or(
            and(eq(friends.requester, auth.name), eq(friends.addressee, target)),
            and(eq(friends.requester, target), eq(friends.addressee, auth.name))
          )
        )
        .limit(1)
    )[0];
    if (exists) return Response.json({ error: "Already exists" }, { status: 400 });
    await db.insert(friends).values({
      requester: auth.name,
      addressee: target,
      status: "pending",
    });
    broadcast({ type: "friend_request", payload: { from: auth.name, to: target } });
    return Response.json({ ok: true });
  }

  if (action === "accept") {
    await db
      .update(friends)
      .set({ status: "accepted" })
      .where(
        and(eq(friends.requester, target), eq(friends.addressee, auth.name))
      );
    broadcast({ type: "friend_accept", payload: { a: auth.name, b: target } });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

// DM channel id helper handled client-side using sorted names
