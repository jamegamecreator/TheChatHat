export type User = {
  id: number;
  name: string;
  bio: string;
  avatar: string;
  status: string;
  isOwner: boolean;
  badges: string[];
};

export type Message = {
  id: number;
  channelId: string;
  userId: number;
  name: string;
  content: string;
  type: string;
  meta?: Record<string, unknown>;
  unlockAt?: string | null;
  createdAt: string;
  badges?: string[];
  isOwner?: boolean;
  avatar?: string;
};

export type Channel = {
  id: number;
  name: string;
  code: string;
  isPrivate: boolean;
  hidden: boolean;
  locked: boolean;
  createdBy: string;
};

const TOKEN_KEY = "chathat-token";
const USER_KEY = "chathat-user";

export function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return data as T;
}

export const THEMES = [
  { id: "light", name: "Simple White", swatch: "#ffffff" },
  { id: "hacker", name: "Hacker Green", swatch: "#0b120c" },
  { id: "cyberpunk", name: "Cyberpunk", swatch: "#1c1030" },
  { id: "obsidian", name: "Obsidian OLED", swatch: "#000000" },
  { id: "nordic", name: "Nordic Ice", swatch: "#e9eef4" },
  { id: "latte", name: "Sunset Latte", swatch: "#f3e9dc" },
  { id: "royal", name: "Royal Purple", swatch: "#7c3aed" },
] as const;

export function setTheme(id: string) {
  document.documentElement.setAttribute("data-theme", id);
  try {
    localStorage.setItem("chathat-theme", id);
  } catch {
    /* ignore */
  }
}

export function getTheme(): string {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") || "light";
}

// Simple Web Audio alarm
export function playAlarm() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(i < 3 ? 880 : 220, now + i);
      osc.frequency.linearRampToValueAtTime(i < 3 ? 440 : 110, now + i + 0.8);
      gain.gain.setValueAtTime(0.0001, now + i);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i);
      osc.stop(now + i + 1);
    }
    setTimeout(() => ctx.close(), 5000);
  } catch {
    /* ignore */
  }
}

export function dmChannelId(a: string, b: string) {
  return "dm:" + [a, b].sort().join("|");
}
