"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  api,
  getToken,
  getStoredUser,
  clearSession,
  setTheme,
  getTheme,
  THEMES,
  User,
  Message,
  Channel,
  dmChannelId,
} from "@/lib/client";
import { HatLogo, GlobeIcon, ChannelsIcon, FriendsIcon, AdminIcon, SendIcon, SunIcon, ImageIcon, SafeIcon, BoardIcon, PollIcon, MicIcon, CrownBadge, CloseIcon } from "./Icons";
import LoginCard from "./LoginCard";
import MessageBubble from "./MessageBubble";
import JaberOverlay from "./JaberOverlay";
import AdminEffects, { EffectEvent } from "./AdminEffects";
import ProfileModal, { statusColor } from "./ProfileModal";
import AdminPanel from "./AdminPanel";
import WhiteboardDrawer from "./WhiteboardDrawer";

type Tab = "global" | "channels" | "friends" | "admin";

export default function ChatApp() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("global");
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<{ id: string; name: string }>({ id: "global", name: "Global Chat" });
  const [online, setOnline] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [friends, setFriends] = useState<{ requester: string; addressee: string; status: string }[]>([]);
  const [directory, setDirectory] = useState<{ name: string; avatar: string; status: string; isOwner: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [jaberAlert, setJaberAlert] = useState(false);
  const [effect, setEffect] = useState<EffectEvent | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [praiseMode, setPraiseMode] = useState(false);
  const [themeState, setThemeState] = useState("light");
  const [showBoard, setShowBoard] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showCapsule, setShowCapsule] = useState(false);
  const [recording, setRecording] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const channelRef = useRef(channel.id);
  channelRef.current = channel.id;

  // Restore session
  useEffect(() => {
    const u = getStoredUser();
    if (u && getToken()) setUser(u);
    setThemeState(getTheme());
    setReady(true);
  }, []);

  const normalize = useCallback((m: Message): Message => ({
    ...m,
    isOwner: m.isOwner || m.name === "Jaber",
  }), []);

  const loadMessages = useCallback(async (chId: string) => {
    try {
      const res = await api<{ messages: Message[] }>(`/api/messages?channel=${encodeURIComponent(chId)}`);
      setMessages(res.messages.map(normalize));
    } catch { /* ignore */ }
  }, [normalize]);

  const loadChannels = useCallback(async () => {
    try {
      const res = await api<{ channels: Channel[] }>("/api/channels");
      setChannels(res.channels);
    } catch { /* ignore */ }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const res = await api<{ friends: typeof friends; users: typeof directory }>("/api/friends");
      setFriends(res.friends);
      setDirectory(res.users);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadMessages(channel.id);
  }, [user, channel.id, loadMessages]);

  useEffect(() => {
    if (!user) return;
    loadChannels();
    loadFriends();
  }, [user, loadChannels, loadFriends]);

  // Auto scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typingUsers]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleEffect = useCallback((payload: EffectEvent) => {
    setEffect({ ...payload, id: Date.now() + Math.random() });
    const me = getStoredUser()?.name;
    const targeted = payload.target === "all" || payload.target === me;
    if (payload.power === "frostlock" && targeted) {
      setFrozen(true);
      setTimeout(() => setFrozen(false), 15000);
    }
    if (payload.power === "slowmo" && targeted) {
      setCooldown(20);
    }
    if (payload.power === "praise") {
      setPraiseMode(true);
      setTimeout(() => setPraiseMode(false), 30000);
    }
    if (payload.power === "thanos" && payload.target === me) {
      setTimeout(() => {
        clearSession();
        location.reload();
      }, 2000);
    }
  }, []);

  // SSE connection
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    const es = new EventSource(`/api/stream?token=${encodeURIComponent(token || "")}`);

    es.addEventListener("bus", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as { type: string; payload: any; channelId?: string };
        switch (data.type) {
          case "message":
            if ((data.channelId || "global") === channelRef.current) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === data.payload.id)) return prev;
                return [...prev, normalize(data.payload)];
              });
            }
            break;
          case "typing": {
            if ((data.channelId || "global") !== channelRef.current) break;
            const { name, typing } = data.payload;
            const me = getStoredUser()?.name;
            if (name === me) break;
            setTypingUsers((prev) => {
              if (typing) return prev.includes(name) ? prev : [...prev, name];
              return prev.filter((n) => n !== name);
            });
            break;
          }
          case "presence":
            setOnline(data.payload.online || []);
            break;
          case "jaber_alert":
            setJaberAlert(true);
            break;
          case "admin_effect":
            handleEffect(data.payload);
            break;
          case "theme_override":
            setTheme(data.payload.theme);
            setThemeState(data.payload.theme);
            break;
          case "purge":
            if (data.payload.channelId === channelRef.current) setMessages([]);
            break;
          case "banned": {
            const me = getStoredUser()?.name;
            if (data.payload.target === me) {
              clearSession();
              location.reload();
            }
            break;
          }
          case "channel_created":
            setChannels((prev) => prev.some((c) => c.id === data.payload.id) ? prev : [...prev, data.payload]);
            break;
          case "profile_update":
            setDirectory((prev) => prev.map((u) => u.name === data.payload.name ? { ...u, ...data.payload } : u));
            break;
        }
      } catch { /* ignore */ }
    });

    return () => es.close();
  }, [user, normalize, handleEffect]);

  const doTheme = (id: string) => {
    setTheme(id);
    setThemeState(id);
    setShowThemes(false);
  };

  const sendTyping = (typing: boolean) => {
    api("/api/typing", { method: "POST", body: JSON.stringify({ channelId: channel.id, typing }) }).catch(() => {});
  };

  const onInputChange = (v: string) => {
    setInput(v);
    sendTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 1500);
  };

  const send = async (content: string, type = "text", meta: Record<string, unknown> = {}, unlockAt?: string) => {
    if (!content || cooldown > 0 || frozen) return;
    const finalContent = praiseMode && type === "text" ? "🎩 All Hail Jaber!" : content;
    sendTyping(false);
    try {
      await api("/api/messages", { method: "POST", body: JSON.stringify({ channelId: channel.id, content: finalContent, type, meta, unlockAt }) });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const sendText = async () => {
    const v = input.trim();
    if (!v) return;
    setInput("");
    await send(v, "text");
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4_000_000) { alert("File too large (max 4MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const type = f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image";
      send(data, type);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRec.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 4_000_000) { alert("Recording too large"); return; }
        const reader = new FileReader();
        reader.onload = () => send(reader.result as string, "audio");
        reader.readAsDataURL(blob);
      };
      mediaRec.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      alert("Microphone access denied");
    }
  };

  const openDM = (name: string) => {
    if (!user) return;
    const id = dmChannelId(user.name, name);
    setChannel({ id, name: `DM · ${name}` });
    setTab("global");
  };

  const openChannel = (c: Channel) => {
    setChannel({ id: `channel:${c.code}`, name: `# ${c.name}` });
    setTab("global");
  };

  if (!ready) return <div className="grid min-h-screen place-items-center">…</div>;
  if (!user) return <LoginCard onLogin={setUser} />;

  const isOwner = user.isOwner;
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "global", label: "Chat", icon: <GlobeIcon width={20} height={20} /> },
    { id: "channels", label: "Channels", icon: <ChannelsIcon width={20} height={20} /> },
    { id: "friends", label: "Friends", icon: <FriendsIcon width={20} height={20} /> },
    ...(isOwner ? [{ id: "admin" as Tab, label: "Admin", icon: <AdminIcon width={20} height={20} /> }] : []),
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top nav */}
      <header className="flex items-center justify-between border-b px-4 py-2.5" style={{ background: "var(--panel)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text)" }}><HatLogo size={26} /></span>
          <span className="text-lg font-bold tracking-tight">ChatHat</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs sm:inline" style={{ color: "var(--muted)" }}>
            {online.length} online
          </span>
          <div className="relative">
            <button onClick={() => setShowThemes((s) => !s)} className="grid h-9 w-9 place-items-center rounded-full border" style={{ background: "var(--panel-2)" }}>
              <SunIcon width={18} height={18} />
            </button>
            {showThemes && (
              <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border p-1.5" style={{ background: "var(--panel)", boxShadow: "var(--shadow)" }}>
                {THEMES.map((t) => (
                  <button key={t.id} onClick={() => doTheme(t.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:opacity-70" style={{ background: themeState === t.id ? "var(--panel-2)" : "transparent" }}>
                    <span className="h-4 w-4 rounded-full border" style={{ background: t.swatch }} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowProfile(true)} className="relative aura-ring" style={{ "--aura-color": statusColor(user.status) } as React.CSSProperties}>
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="me" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold" style={{ background: "var(--panel-2)" }}>
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Main area */}
      <main className="relative flex-1 overflow-hidden">
        {(tab === "global") && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2" style={{ background: "var(--panel)" }}>
              <div className="flex items-center gap-2 font-semibold">
                {channel.name}
                {isOwner && channel.id.startsWith("channel:") && <span className="text-xs" style={{ color: "var(--muted)" }}></span>}
              </div>
              {channel.id !== "global" && (
                <button onClick={() => setChannel({ id: "global", name: "Global Chat" })} className="text-xs underline" style={{ color: "var(--accent)" }}>
                  ← Global
                </button>
              )}
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-2">
              {messages.length === 0 && (
                <div className="grid h-full place-items-center text-sm" style={{ color: "var(--muted)" }}>
                  No messages yet. Say hi 👋
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} mine={m.name === user.name} onZoom={setZoom} />
              ))}
              {typingUsers.length > 0 && (
                <div className="text-xs italic" style={{ color: "var(--muted)" }}>
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t px-3 py-2.5 pb-24" style={{ background: "var(--panel)" }}>
              {(frozen || cooldown > 0) && (
                <div className="mb-1.5 text-center text-xs font-medium" style={{ color: "#ef4444" }}>
                  {frozen ? "❄️ Your input is frozen by the Owner" : `🐌 Slow-Mo curse: wait ${cooldown}s`}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <button onClick={() => fileRef.current?.click()} title="Share media" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:opacity-70" style={{ color: "var(--muted)" }}>
                  <ImageIcon width={19} height={19} />
                </button>
                <button onClick={() => setShowCapsule(true)} title="Time capsule" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:opacity-70" style={{ color: "var(--muted)" }}>
                  <SafeIcon width={19} height={19} />
                </button>
                <button onClick={() => setShowPoll(true)} title="Create poll" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:opacity-70" style={{ color: "var(--muted)" }}>
                  <PollIcon width={19} height={19} />
                </button>
                <button onClick={() => setShowBoard(true)} title="Whiteboard / Code" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:opacity-70" style={{ color: "var(--muted)" }}>
                  <BoardIcon width={19} height={19} />
                </button>
                <button onClick={toggleRecord} title="Voice message" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:opacity-70" style={{ color: recording ? "#ef4444" : "var(--muted)" }}>
                  <MicIcon width={19} height={19} />
                </button>
                <input
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
                  placeholder={recording ? "Recording… tap mic to send" : "Type a message"}
                  disabled={frozen}
                  className="flex-1 rounded-full border px-4 py-2 text-sm outline-none disabled:opacity-50"
                  style={{ background: "var(--panel-2)", color: "var(--text)" }}
                />
                <button onClick={sendText} disabled={!input.trim() || cooldown > 0 || frozen} className="grid h-9 w-9 shrink-0 place-items-center rounded-full disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                  <SendIcon width={18} height={18} />
                </button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" hidden onChange={onFile} />
          </div>
        )}

        {tab === "channels" && (
          <ChannelsTab channels={channels} onOpen={openChannel} onCreated={loadChannels} isOwner={isOwner} />
        )}

        {tab === "friends" && (
          <FriendsTab me={user.name} friends={friends} directory={directory} online={online} reload={loadFriends} onDM={openDM} />
        )}

        {tab === "admin" && isOwner && (
          <div className="h-full overflow-y-auto px-4 py-4 pb-28">
            <AdminPanel currentChannel={channel.id} online={online} />
          </div>
        )}
      </main>

      {/* Bottom dock */}
      <nav className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border p-1.5 glass" style={{ boxShadow: "var(--shadow)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition"
            style={{
              background: tab === t.id ? "var(--accent)" : "transparent",
              color: tab === t.id ? "var(--accent-contrast)" : "var(--muted)",
            }}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Overlays */}
      {jaberAlert && <JaberOverlay onDone={() => setJaberAlert(false)} />}
      <AdminEffects effect={effect} meName={user.name} />
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onUpdate={setUser} />}
      {zoom && (
        <div className="fixed inset-0 z-[9995] grid cursor-zoom-out place-items-center bg-black/85 p-6" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="zoom" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
      {showBoard && <WhiteboardDrawer onClose={() => setShowBoard(false)} onSend={(content, type) => { send(content, type); setShowBoard(false); }} />}
      {showPoll && <PollModal onClose={() => setShowPoll(false)} onCreate={(q, opts) => { send(q, "poll", { question: q, options: opts }); setShowPoll(false); }} />}
      {showCapsule && <CapsuleModal onClose={() => setShowCapsule(false)} onCreate={(text, when) => { send(text, "capsule", {}, when); setShowCapsule(false); }} />}
    </div>
  );
}

/* ---------- Channels Tab ---------- */
function ChannelsTab({ channels, onOpen, onCreated, isOwner }: { channels: Channel[]; onOpen: (c: Channel) => void; onCreated: () => void; isOwner: boolean }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const create = async () => {
    if (!name.trim()) return;
    await api("/api/channels", { method: "POST", body: JSON.stringify({ name, isPrivate: true }) });
    setName("");
    onCreated();
    setMsg("Channel created!");
    setTimeout(() => setMsg(""), 2000);
  };
  const join = async () => {
    try {
      const res = await api<{ channel: Channel }>("/api/channels", { method: "POST", body: JSON.stringify({ action: "join", code }) });
      setCode("");
      onOpen(res.channel);
    } catch (e) { setMsg((e as Error).message); setTimeout(() => setMsg(""), 2000); }
  };

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto px-4 py-4 pb-28">
      <h2 className="mb-3 text-lg font-bold">Channels</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-3" style={{ background: "var(--panel)" }}>
          <div className="mb-2 text-sm font-semibold">Create</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ background: "var(--panel-2)", color: "var(--text)" }} />
          <button onClick={create} className="w-full rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Create</button>
        </div>
        <div className="rounded-xl border p-3" style={{ background: "var(--panel)" }}>
          <div className="mb-2 text-sm font-semibold">Join by code</div>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ background: "var(--panel-2)", color: "var(--text)" }} />
          <button onClick={join} className="w-full rounded-lg border px-3 py-2 text-sm font-semibold">Join</button>
        </div>
      </div>
      {msg && <div className="mt-2 text-center text-xs" style={{ color: "var(--accent)" }}>{msg}</div>}
      <div className="mt-4 space-y-2">
        {channels.map((c) => (
          <button key={c.id} onClick={() => onOpen(c)} className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left hover:opacity-80" style={{ background: "var(--panel)" }}>
            <div>
              <div className="text-sm font-semibold flex items-center gap-1"># {c.name} {c.hidden && isOwner && <span className="text-[10px]" style={{ color: "var(--muted)" }}>👻 phantom</span>}</div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>Code: {c.code} · by {c.createdBy}</div>
            </div>
            <span style={{ color: "var(--muted)" }}><ChannelsIcon width={18} height={18} /></span>
          </button>
        ))}
        {channels.length === 0 && <div className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>No channels yet. Create one!</div>}
      </div>
    </div>
  );
}

/* ---------- Friends Tab ---------- */
function FriendsTab({ me, friends, directory, online, reload, onDM }: { me: string; friends: { requester: string; addressee: string; status: string }[]; directory: { name: string; avatar: string; status: string; isOwner: boolean }[]; online: string[]; reload: () => void; onDM: (n: string) => void }) {
  const [search, setSearch] = useState("");
  const myFriends = friends.filter((f) => f.status === "accepted").map((f) => (f.requester === me ? f.addressee : f.requester));
  const pendingIn = friends.filter((f) => f.status === "pending" && f.addressee === me).map((f) => f.requester);

  const add = async (target: string) => { await api("/api/friends", { method: "POST", body: JSON.stringify({ action: "add", target }) }); reload(); };
  const accept = async (target: string) => { await api("/api/friends", { method: "POST", body: JSON.stringify({ action: "accept", target }) }); reload(); };

  const others = directory.filter((u) => u.name !== me && u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto px-4 py-4 pb-28">
      <h2 className="mb-3 text-lg font-bold">Friends</h2>
      {pendingIn.length > 0 && (
        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>Requests</div>
          {pendingIn.map((n) => (
            <div key={n} className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ background: "var(--panel)" }}>
              <span className="text-sm font-medium">{n}</span>
              <button onClick={() => accept(n)} className="rounded-lg px-3 py-1 text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Accept</button>
            </div>
          ))}
        </div>
      )}
      {myFriends.length > 0 && (
        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>Your friends</div>
          {myFriends.map((n) => (
            <div key={n} className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ background: "var(--panel)" }}>
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: online.includes(n) ? "#22c55e" : "var(--border)" }} />
                {n} {n === "Jaber" && <CrownBadge size={12} />}
              </span>
              <button onClick={() => onDM(n)} className="rounded-lg border px-3 py-1 text-xs font-semibold">Message</button>
            </div>
          ))}
        </div>
      )}
      <div className="mb-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>Add people</div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ background: "var(--panel-2)", color: "var(--text)" }} />
      <div className="space-y-2">
        {others.map((u) => {
          const already = myFriends.includes(u.name) || friends.some((f) => (f.requester === me && f.addressee === u.name) || (f.addressee === me && f.requester === u.name));
          return (
            <div key={u.name} className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ background: "var(--panel)" }}>
              <span className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: online.includes(u.name) ? "#22c55e" : "var(--border)" }} />
                {u.name} {u.isOwner && <CrownBadge size={12} />}
              </span>
              {already ? <span className="text-xs" style={{ color: "var(--muted)" }}>added</span> : <button onClick={() => add(u.name)} className="rounded-lg px-3 py-1 text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Add</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Poll Modal ---------- */
function PollModal({ onClose, onCreate }: { onClose: () => void; onCreate: (q: string, opts: string[]) => void }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  return (
    <div className="fixed inset-0 z-[9990] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border p-5" style={{ background: "var(--panel)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Create Poll</h3><button onClick={onClose}><CloseIcon width={18} height={18} /></button></div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Question" className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ background: "var(--panel-2)", color: "var(--text)" }} />
        {opts.map((o, i) => (
          <input key={i} value={o} onChange={(e) => setOpts((p) => p.map((x, j) => j === i ? e.target.value : x))} placeholder={`Option ${i + 1}`} className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ background: "var(--panel-2)", color: "var(--text)" }} />
        ))}
        <button onClick={() => setOpts((p) => [...p, ""])} className="mb-3 text-xs underline" style={{ color: "var(--accent)" }}>+ Add option</button>
        <button onClick={() => { const clean = opts.map((o) => o.trim()).filter(Boolean); if (q.trim() && clean.length >= 2) onCreate(q.trim(), clean); }} className="w-full rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Post Poll</button>
      </div>
    </div>
  );
}

/* ---------- Capsule Modal ---------- */
function CapsuleModal({ onClose, onCreate }: { onClose: () => void; onCreate: (text: string, when: string) => void }) {
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  return (
    <div className="fixed inset-0 z-[9990] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border p-5" style={{ background: "var(--panel)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">🔒 Time Capsule</h3><button onClick={onClose}><CloseIcon width={18} height={18} /></button></div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Secret message…" className="mb-2 w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none" style={{ background: "var(--panel-2)", color: "var(--text)" }} />
        <label className="text-xs" style={{ color: "var(--muted)" }}>Unlocks at</label>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ background: "var(--panel-2)", color: "var(--text)" }} />
        <button onClick={() => { if (text.trim() && when) onCreate(text.trim(), new Date(when).toISOString()); }} className="w-full rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Lock it</button>
      </div>
    </div>
  );
}
