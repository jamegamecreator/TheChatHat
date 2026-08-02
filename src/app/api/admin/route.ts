import { db } from "@/db";
import { users, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { tokenFromRequest } from "@/lib/auth";
import { broadcast, onlineUsers } from "@/lib/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Effects that are pure client-side reactions get broadcast as admin_effect.
const EFFECTS = new Set([
  "omnicast",
  "voiceofgod",
  "mindreader",
  "glitch",
  "doppelganger",
  "uichaos",
  "frostlock",
  "slowmo",
  "nuke",
  "echo",
  "gravity",
  "thanos",
  "flashbang",
  "praise",
  "spotlight",
  "confetti",
  "timemachine",
  "invisibility",
  "silentspy",
  "lockdown",
  "summon",
  "puppeteer",
  "privilege",
  "unfreeze",
]);

export async function POST(req: Request) {
  const auth = tokenFromRequest(req);
  if (!auth || !auth.isOwner) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const power: string = body.power;
  const target: string = body.target || "all";
  const value = body.value;

  // Server-persisted powers
  switch (power) {
    case "purge": {
      // Global purge / clear chat
      const ch = value?.channelId || "global";
      await db.delete(messages).where(eq(messages.channelId, ch));
      broadcast({ type: "purge", payload: { channelId: ch } });
      return Response.json({ ok: true });
    }
    case "ban": {
      await db.update(users).set({ banned: true }).where(eq(users.name, target));
      broadcast({ type: "admin_effect", payload: { power: "thanos", target } });
      broadcast({ type: "banned", payload: { target } });
      return Response.json({ ok: true });
    }
    case "shadowrealm": {
      const u = (
        await db.select().from(users).where(eq(users.name, target)).limit(1)
      )[0];
      await db
        .update(users)
        .set({ shadowbanned: !u?.shadowbanned })
        .where(eq(users.name, target));
      return Response.json({ ok: true, shadowbanned: !u?.shadowbanned });
    }
    case "badge": {
      const u = (
        await db.select().from(users).where(eq(users.name, target)).limit(1)
      )[0];
      if (u) {
        const badges = Array.from(new Set([...(u.badges || []), value?.badge || "royal"]));
        await db.update(users).set({ badges }).where(eq(users.name, target));
        broadcast({ type: "profile_update", payload: { name: target, badges } });
      }
      return Response.json({ ok: true });
    }
    case "avatarswap": {
      await db
        .update(users)
        .set({ avatar: value?.avatar || "" })
        .where(eq(users.name, target));
      broadcast({
        type: "profile_update",
        payload: { name: target, avatar: value?.avatar || "" },
      });
      return Response.json({ ok: true });
    }
    case "themeoverride": {
      broadcast({ type: "theme_override", payload: { theme: value?.theme } });
      return Response.json({ ok: true });
    }
    case "message_override": {
      // Puppeteer: post a message as the target user
      await db.insert(messages).values({
        channelId: value?.channelId || "global",
        userId: 0,
        name: target,
        content: (value?.content || "").toString().slice(0, 2000),
        type: "text",
      });
      broadcast({
        type: "message",
        payload: {
          channelId: value?.channelId || "global",
          name: target,
          content: value?.content,
          type: "text",
          createdAt: new Date().toISOString(),
          id: Date.now(),
        },
        channelId: value?.channelId || "global",
      });
      return Response.json({ ok: true });
    }
    case "online": {
      return Response.json({ online: onlineUsers() });
    }
  }

  // Pure client-side effect broadcasts
  if (EFFECTS.has(power)) {
    broadcast({
      type: "admin_effect",
      payload: { power, target, value, from: auth.name },
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown power" }, { status: 400 });
}
