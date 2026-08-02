"use client";
import { useState } from "react";
import { api, THEMES } from "@/lib/client";

type Power = {
  n: number;
  label: string;
  emoji: string;
  run: (target: string) => Promise<void> | void;
};

async function admin(power: string, target: string, value?: unknown) {
  await api("/api/admin", {
    method: "POST",
    body: JSON.stringify({ power, target, value }),
  });
}

export default function AdminPanel({
  currentChannel,
  online,
}: {
  currentChannel: string;
  online: string[];
}) {
  const [target, setTarget] = useState("all");
  const [flash, setFlash] = useState("");

  const notify = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(""), 2000);
  };

  const powers: Power[] = [
    { n: 1, label: "Omni-Cast", emoji: "📢", run: async (t) => { const m = prompt("Broadcast message:"); if (m) { await admin("omnicast", t, { text: m }); notify("Omni-Cast sent"); } } },
    { n: 2, label: "Voice of God", emoji: "🔊", run: async () => { const m = prompt("Voice of God says:"); if (m) { await admin("voiceofgod", "all", { text: m }); notify("Voice broadcast"); } } },
    { n: 3, label: "Mind Reader", emoji: "👁️", run: async (t) => { await admin("mindreader", t); notify("Keylogger engaged"); } },
    { n: 4, label: "Glitch Matrix", emoji: "🌀", run: async (t) => { await admin("glitch", t); notify("Glitch deployed"); } },
    { n: 5, label: "Doppelgänger", emoji: "🎭", run: async (t) => { await admin("doppelganger", t); notify("Identity hijacked"); } },
    { n: 6, label: "UI Chaos", emoji: "🔃", run: async (t) => { await admin("uichaos", t, { mode: Math.random() > 0.5 ? "flip" : "spin" }); notify("Chaos unleashed"); } },
    { n: 7, label: "Frost Lock", emoji: "❄️", run: async (t) => { await admin("frostlock", t); notify("Inputs frozen"); } },
    { n: 8, label: "Slow-Mo Curse", emoji: "🐌", run: async (t) => { await admin("slowmo", t); notify("Cooldown cursed"); } },
    { n: 9, label: "The Nuke", emoji: "☢️", run: async (t) => { const m = prompt("Priority message:") || "INCOMING"; await admin("nuke", t, { text: m }); notify("Nuke launched"); } },
    { n: 10, label: "Echo Chamber", emoji: "🔁", run: async (t) => { await admin("echo", t); notify("Echo active"); } },
    { n: 11, label: "Gravity Drop", emoji: "🪂", run: async (t) => { await admin("gravity", t); notify("Gravity applied"); } },
    { n: 12, label: "Thanos Snap", emoji: "🫰", run: async (t) => { if (t === "all" || confirm("Snap " + t + "?")) { await admin("thanos", t); notify("Snapped"); } } },
    { n: 13, label: "Flashbang", emoji: "💥", run: async (t) => { await admin("flashbang", t); notify("Flashbang!"); } },
    { n: 14, label: "Royal Badge", emoji: "👑", run: async (t) => { if (t !== "all") { await admin("badge", t, { badge: "royal" }); notify("Badge bestowed"); } else notify("Pick a user"); } },
    { n: 15, label: "Avatar Swap", emoji: "🖼️", run: async (t) => { const u = prompt("New avatar URL:"); if (u && t !== "all") { await admin("avatarswap", t, { avatar: u }); notify("Avatar swapped"); } } },
    { n: 16, label: "Praise Convert", emoji: "🙌", run: async () => { await admin("praise", "all"); notify("All hail Jaber!"); } },
    { n: 17, label: "Spotlight Blackout", emoji: "🔦", run: async (t) => { await admin("spotlight", t); notify("Spotlight on"); } },
    { n: 18, label: "Confetti Storm", emoji: "🎉", run: async () => { await admin("confetti", "all"); notify("Confetti!"); } },
    { n: 19, label: "Time Machine", emoji: "⏪", run: async () => { await admin("timemachine", "all"); notify("Rewound"); } },
    { n: 20, label: "Phantom Vault", emoji: "🕳️", run: async () => { const name = prompt("Invisible channel name:"); if (name) { await api("/api/channels", { method: "POST", body: JSON.stringify({ name, hidden: true, isPrivate: true }) }); notify("Vault created"); } } },
    { n: 21, label: "Ghost Invisibility", emoji: "👻", run: async () => { await admin("invisibility", "all"); notify("Invisible"); } },
    { n: 22, label: "Global Purge", emoji: "🧹", run: async () => { if (confirm("Clear all messages in this channel?")) { await admin("purge", "all", { channelId: currentChannel }); notify("Purged"); } } },
    { n: 23, label: "Silent Spy", emoji: "🕵️", run: async () => { await admin("silentspy", "all"); notify("Spying"); } },
    { n: 24, label: "Channel Lockdown", emoji: "🔒", run: async (t) => { await admin("lockdown", t); notify("Locked down"); } },
    { n: 25, label: "Shadow Realm", emoji: "🌑", run: async (t) => { if (t !== "all") { const r = await api<{ shadowbanned: boolean }>("/api/admin", { method: "POST", body: JSON.stringify({ power: "shadowrealm", target: t }) }); notify(r.shadowbanned ? "Shadowbanned" : "Restored"); } else notify("Pick a user"); } },
    { n: 26, label: "Theme Override", emoji: "🎨", run: async () => { const t = prompt("Theme id (light,hacker,cyberpunk,obsidian,nordic,latte,royal):"); if (t && THEMES.some((x) => x.id === t)) { await admin("themeoverride", "all", { theme: t }); notify("Theme forced"); } } },
    { n: 27, label: "Mass Summon", emoji: "📣", run: async () => { const m = prompt("Summon message:") || "Report to the throne!"; await admin("summon", "all", { text: m }); notify("Summoned all"); } },
    { n: 28, label: "Puppeteer", emoji: "🎏", run: async (t) => { if (t !== "all") { const c = prompt("Say as " + t + ":"); if (c) { await admin("message_override", t, { channelId: currentChannel, content: c }); notify("Puppeteered"); } } else notify("Pick a user"); } },
    { n: 29, label: "Ban Hammer", emoji: "🔨", run: async (t) => { if (t !== "all" && confirm("Ban " + t + "?")) { await admin("ban", t); notify("Banned"); } else if (t === "all") notify("Pick a user"); } },
    { n: 30, label: "Privilege Transfer", emoji: "🤝", run: async (t) => { if (t !== "all") { await admin("privilege", t); notify("Privilege sent"); } else notify("Pick a user"); } },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Owner Admin Panel</h2>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#facc15", color: "#000" }}>
          30 SUPERPOWERS
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Target</label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-lg border px-2 py-1.5 text-sm outline-none"
          style={{ background: "var(--panel-2)", color: "var(--text)" }}
        >
          <option value="all">Everyone (Global)</option>
          {online.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {flash && (
        <div className="mb-3 rounded-lg px-3 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {flash}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3">
        {powers.map((p) => (
          <button
            key={p.n}
            onClick={() => p.run(target)}
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition hover:opacity-80"
            style={{ background: "var(--panel)" }}
          >
            <span className="text-lg">{p.emoji}</span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>#{p.n}</span>
              <span className="font-medium">{p.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
