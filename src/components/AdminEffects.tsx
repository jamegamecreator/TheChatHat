"use client";
import { useEffect, useState, useCallback } from "react";

export type EffectEvent = {
  id: number;
  power: string;
  target: string;
  value?: { text?: string; theme?: string; [k: string]: unknown };
  from?: string;
};

const CONFETTI_COLORS = ["#ff3b6b", "#ffb703", "#06d6a0", "#4cc9f0", "#b5179e", "#f72585"];

export default function AdminEffects({
  effect,
  meName,
}: {
  effect: EffectEvent | null;
  meName: string;
}) {
  const [overlay, setOverlay] = useState<null | { power: string; text: string }>(null);
  const [flash, setFlash] = useState(0);
  const [confetti, setConfetti] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  const clearBody = useCallback(() => {
    document.body.classList.remove("fx-shake", "fx-spin", "fx-flip", "fx-gravity", "fx-glitch");
  }, []);

  useEffect(() => {
    if (!effect) return;
    const { power, target, value } = effect;
    const targeted = target === "all" || target === meName;

    switch (power) {
      case "omnicast":
        if (targeted) setOverlay({ power, text: value?.text || "📢 A message from the Owner" });
        break;
      case "flashbang":
        if (targeted) setFlash((f) => f + 1);
        break;
      case "confetti":
        setConfetti((c) => c + 1);
        setTimeout(() => setConfetti((c) => Math.max(0, c - 1)), 4000);
        break;
      case "nuke":
        if (targeted) {
          document.body.classList.add("fx-shake");
          setOverlay({ power, text: value?.text || "☢️ PRIORITY MESSAGE" });
          setTimeout(() => document.body.classList.remove("fx-shake"), 1600);
        }
        break;
      case "uichaos":
        if (targeted) {
          document.body.classList.add(value?.mode === "flip" ? "fx-flip" : "fx-spin");
          setTimeout(() => clearBody(), 2500);
        }
        break;
      case "gravity":
        if (targeted) {
          document.body.classList.add("fx-gravity");
          setTimeout(() => clearBody(), 1800);
        }
        break;
      case "glitch":
        if (targeted) {
          document.body.classList.add("fx-glitch");
          setTimeout(() => clearBody(), 2200);
        }
        break;
      case "thanos":
        if (target === meName) {
          document.body.classList.add("fx-thanos");
        }
        break;
      case "spotlight":
        if (targeted) setOverlay({ power: "spotlight", text: "" });
        break;
      case "summon":
        if (targeted) setOverlay({ power: "summon", text: value?.text || "👑 You have been summoned by the Owner" });
        break;
      case "doppelganger":
        if (targeted) setBanner("🎭 Doppelgänger active — your identity has been hijacked by the Owner");
        break;
      case "voiceofgod":
        setBanner("🔊 VOICE OF GOD — The Owner is broadcasting: " + (value?.text || "..."));
        break;
      case "mindreader":
        if (target === meName) setBanner("👁️ Mind Reader engaged — the Owner can see your keystrokes");
        break;
      case "silentspy":
        setBanner("🕵️ A silent spy is watching this channel");
        break;
      case "invisibility":
        setBanner("👻 The Owner has gone invisible");
        break;
      case "lockdown":
        if (targeted) setBanner("🔒 Channel Lockdown — time is frozen");
        break;
      case "timemachine":
        setBanner("⏪ Chat Time Machine — the Owner rewound this channel");
        break;
      case "privilege":
        setBanner("🤝 Privilege Transfer initiated by the Owner");
        break;
      case "echo":
        setBanner("🔁 Echo Chamber activated");
        break;
      default:
        break;
    }

    if (["doppelganger", "voiceofgod", "mindreader", "silentspy", "invisibility", "lockdown", "timemachine", "privilege", "echo"].includes(power)) {
      const t = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect?.id]);

  return (
    <>
      {/* Flashbang */}
      {flash > 0 && (
        <div key={"flash" + flash} className="fx-flashbang" onAnimationEnd={() => setFlash(0)} />
      )}

      {/* Confetti storm */}
      {confetti > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden">
          {Array.from({ length: 90 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5vh`,
                width: 8,
                height: 12,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDuration: `${2 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 0.6}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Full-screen overlays */}
      {overlay && (
        <div
          className="fixed inset-0 z-[9997] grid place-items-center p-8 text-center"
          style={{
            background:
              overlay.power === "spotlight"
                ? "radial-gradient(circle at center, transparent 8%, rgba(0,0,0,0.94) 30%)"
                : "rgba(0,0,0,0.9)",
          }}
          onClick={() => setOverlay(null)}
        >
          {overlay.power !== "spotlight" && (
            <div className="max-w-2xl">
              <div className="mb-4 text-6xl">
                {overlay.power === "nuke" ? "☢️" : overlay.power === "summon" ? "👑" : "🎩"}
              </div>
              <div className="text-3xl font-black text-white sm:text-5xl">{overlay.text}</div>
              <div className="mt-6 text-sm text-white/60">tap anywhere to dismiss</div>
            </div>
          )}
        </div>
      )}

      {/* Banner notices */}
      {banner && (
        <div className="fixed left-1/2 top-20 z-[9996] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg"
          style={{ background: "rgba(0,0,0,0.85)" }}>
          {banner}
        </div>
      )}
    </>
  );
}
