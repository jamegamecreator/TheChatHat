"use client";
import { useState } from "react";
import { api, saveSession, User } from "@/lib/client";
import { HatLogo } from "./Icons";

export default function LoginCard({ onLogin }: { onLogin: (u: User) => void }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{ token: string; user: User }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({ name, password }),
      });
      saveSession(res.token, res.user);
      onLogin(res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl border p-8 glass"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div style={{ color: "var(--text)" }}>
            <HatLogo size={52} />
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">ChatHat</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Enter a name & password. New names sign up instantly.
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoComplete="username"
            className="rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
            style={{ background: "var(--panel-2)", color: "var(--text)" }}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            className="rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
            style={{ background: "var(--panel-2)", color: "var(--text)" }}
          />
          {error && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#fee2e2", color: "#b91c1c" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !name || !password}
            className="mt-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            {loading ? "…" : "Enter ChatHat"}
          </button>
        </form>
      </div>
    </div>
  );
}
