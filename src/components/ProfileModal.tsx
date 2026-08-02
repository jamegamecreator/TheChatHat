"use client";
import { useState, useRef } from "react";
import { api, User, saveSession, getToken } from "@/lib/client";
import { CloseIcon, CrownBadge } from "./Icons";

const STATUSES = [
  { id: "Coding", color: "#ef4444", label: "Coding" },
  { id: "Chilling", color: "#22c55e", label: "Chilling" },
  { id: "Listening", color: "#3b82f6", label: "Listening" },
];

export function statusColor(status: string) {
  return STATUSES.find((s) => s.id === status)?.color || "#22c55e";
}

export default function ProfileModal({
  user,
  onClose,
  onUpdate,
}: {
  user: User;
  onClose: () => void;
  onUpdate: (u: User) => void;
}) {
  const [bio, setBio] = useState(user.bio);
  const [status, setStatus] = useState(user.status);
  const [avatar, setAvatar] = useState(user.avatar);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(f);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api<{ user: User }>("/api/profile", {
        method: "POST",
        body: JSON.stringify({ bio, status, avatar }),
      });
      const token = getToken();
      if (token) saveSession(token, res.user);
      onUpdate(res.user);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ background: "var(--panel)", boxShadow: "var(--shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your Profile</h2>
          <button onClick={onClose} style={{ color: "var(--muted)" }}>
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            className="relative aura-ring"
            style={{ "--aura-color": statusColor(status) } as React.CSSProperties}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="avatar" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full text-2xl font-bold" style={{ background: "var(--panel-2)" }}>
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <span className={user.isOwner ? "rainbow-text" : ""}>{user.name}</span>
            {user.isOwner && <CrownBadge />}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs underline"
            style={{ color: "var(--accent)" }}
          >
            Upload picture
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
        </div>

        <label className="mt-4 block text-xs font-medium" style={{ color: "var(--muted)" }}>
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ background: "var(--panel-2)", color: "var(--text)" }}
        />

        <label className="mt-3 block text-xs font-medium" style={{ color: "var(--muted)" }}>
          Ambient Status Aura
        </label>
        <div className="mt-1 flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium"
              style={{
                background: status === s.id ? "var(--panel-2)" : "transparent",
                borderColor: status === s.id ? s.color : "var(--border)",
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
