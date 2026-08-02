"use client";
import { useState, useEffect } from "react";
import { Message } from "@/lib/client";
import { CrownBadge, SafeIcon } from "./Icons";
import AudioPlayer from "./AudioPlayer";

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatar} alt={name} className="h-8 w-8 rounded-full object-cover" />
    );
  }
  return (
    <div
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold"
      style={{ background: "var(--panel-2)", color: "var(--muted)" }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function NameLabel({ name, isOwner, badges }: { name: string; isOwner?: boolean; badges?: string[] }) {
  const royal = badges?.includes("royal");
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold">
      <span className={isOwner ? "rainbow-text" : ""} style={{ color: isOwner ? undefined : "var(--muted)" }}>
        {name}
      </span>
      {isOwner && <CrownBadge size={13} />}
      {royal && !isOwner && (
        <span className="rounded px-1 text-[9px] font-bold" style={{ background: "#facc15", color: "#000" }}>
          ★ ROYAL
        </span>
      )}
    </span>
  );
}

function Capsule({ msg }: { msg: Message }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const unlock = msg.unlockAt ? new Date(msg.unlockAt).getTime() : 0;
  const locked = unlock > Date.now();
  if (locked) {
    const remaining = Math.max(0, unlock - Date.now());
    const s = Math.floor(remaining / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return (
      <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ background: "var(--panel-2)" }}>
        <SafeIcon width={20} height={20} style={{ color: "var(--accent)" }} />
        <span className="opacity-70">Time Capsule — unlocks in {h > 0 ? `${h}h ` : ""}{m}m {sec}s</span>
      </div>
    );
  }
  return <span className="whitespace-pre-wrap break-words">🔓 {msg.content}</span>;
}

export default function MessageBubble({
  msg,
  mine,
  onZoom,
}: {
  msg: Message;
  mine: boolean;
  onZoom: (src: string) => void;
}) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const renderContent = () => {
    if (msg.type === "capsule") return <Capsule msg={msg} />;
    if (msg.type === "image") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={msg.content}
          alt="shared"
          onClick={() => onZoom(msg.content)}
          className="max-w-full cursor-zoom-in rounded-lg"
          style={{ maxWidth: "min(28rem, 100%)" }}
        />
      );
    }
    if (msg.type === "video") {
      return (
        <video src={msg.content} controls className="rounded-lg" style={{ maxWidth: "min(28rem, 100%)" }} />
      );
    }
    if (msg.type === "audio") {
      return (
        <div style={{ minWidth: 220 }}>
          <AudioPlayer src={msg.content} />
        </div>
      );
    }
    if (msg.type === "poll") {
      return <PollView msg={msg} mine={mine} />;
    }
    return <span className="whitespace-pre-wrap break-words">{msg.content}</span>;
  };

  return (
    <div className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      <Avatar name={msg.name} avatar={msg.avatar} />
      <div className={`flex max-w-[76%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
        {!mine && <NameLabel name={msg.name} isOwner={msg.isOwner} badges={msg.badges} />}
        <div
          className="rounded-2xl px-3 py-2 text-sm leading-relaxed"
          style={{
            background: mine ? "var(--bubble-me)" : "var(--bubble-other)",
            color: mine ? "var(--bubble-me-text)" : "var(--bubble-other-text)",
            borderTopRightRadius: mine ? 4 : undefined,
            borderTopLeftRadius: mine ? undefined : 4,
          }}
        >
          {renderContent()}
        </div>
        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
          {time}
        </span>
      </div>
    </div>
  );
}

function PollView({ msg }: { msg: Message; mine: boolean }) {
  const meta = (msg.meta || {}) as { question?: string; options?: string[] };
  const [votes, setVotes] = useState<number[]>(
    () => (meta.options || []).map(() => 0)
  );
  const [voted, setVoted] = useState(-1);
  const total = votes.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="min-w-[220px]">
      <div className="mb-2 font-semibold">📊 {meta.question}</div>
      <div className="flex flex-col gap-1.5">
        {(meta.options || []).map((opt, i) => {
          const pct = Math.round((votes[i] / total) * 100);
          return (
            <button
              key={i}
              disabled={voted >= 0}
              onClick={() => {
                setVotes((v) => v.map((x, j) => (j === i ? x + 1 : x)));
                setVoted(i);
              }}
              className="relative overflow-hidden rounded-lg border px-2 py-1.5 text-left text-xs"
              style={{ background: "var(--panel)" }}
            >
              <div
                className="absolute inset-y-0 left-0 opacity-25"
                style={{ width: voted >= 0 ? `${pct}%` : 0, background: "var(--accent)" }}
              />
              <span className="relative flex justify-between">
                <span>{opt}</span>
                {voted >= 0 && <span>{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
