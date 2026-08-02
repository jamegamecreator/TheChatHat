import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  signToken,
  OWNER_NAME,
  OWNER_PASSWORD,
} from "@/lib/auth";
import { broadcast, onlineUsers } from "@/lib/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { name, password } = await req.json();
    if (!name || !password || typeof name !== "string") {
      return Response.json({ error: "Name and password required" }, { status: 400 });
    }
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      return Response.json({ error: "Name must be 2-24 characters" }, { status: 400 });
    }

    const isOwnerCreds =
      trimmed.toLowerCase() === OWNER_NAME.toLowerCase();

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.name, trimmed))
      .limit(1);

    let user = existing[0];

    if (user) {
      if (user.banned) {
        return Response.json({ error: "You have been banned from ChatHat." }, { status: 403 });
      }
      if (!verifyPassword(password, user.password)) {
        return Response.json({ error: "Incorrect password for this name" }, { status: 401 });
      }
    } else {
      if (isOwnerCreds && password !== OWNER_PASSWORD) {
        return Response.json({ error: "Incorrect password" }, { status: 401 });
      }
      const inserted = await db
        .insert(users)
        .values({
          name: isOwnerCreds ? OWNER_NAME : trimmed,
          password: hashPassword(password),
          isOwner: isOwnerCreds,
          badges: isOwnerCreds ? ["owner"] : [],
        })
        .returning();
      user = inserted[0];
    }

    const token = signToken({
      id: user.id,
      name: user.name,
      isOwner: user.isOwner,
    });

    if (user.isOwner) {
      broadcast({ type: "jaber_alert", payload: { name: user.name } });
    }
    broadcast({
      type: "presence",
      payload: { online: onlineUsers(), joined: user.name },
    });

    return Response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        status: user.status,
        isOwner: user.isOwner,
        badges: user.badges,
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
