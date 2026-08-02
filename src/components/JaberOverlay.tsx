"use client";
import { useEffect, useState } from "react";
import { playAlarm } from "@/lib/client";

export default function JaberOverlay({ onDone }: { onDone: () => void }) {
  // phase: 0,1,2 => WARNING flashes; 3 => skull; 4 => skull + text; 5 => fade out
  const [phase, setPhase] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    playAlarm();
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 1000));
    timers.push(setTimeout(() => setPhase(2), 2000));
    timers.push(setTimeout(() => setPhase(3), 3000));
    timers.push(setTimeout(() => setPhase(4), 4000));
    timers.push(setTimeout(() => setFading(true), 6000));
    timers.push(setTimeout(() => onDone(), 6600));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const showWarning = phase < 3;

  return (
    <div
      className="fixed inset-0 z-[10000] grid place-items-center transition-opacity duration-500"
      style={{
        background: "#000",
        opacity: fading ? 0 : 1,
      }}
    >
      {showWarning && (
        <div
          key={phase}
          className="warn-flash text-center font-black tracking-widest"
          style={{ color: "#ff1a1a", fontSize: "clamp(3rem, 14vw, 12rem)" }}
        >
          WARNING
        </div>
      )}
      {phase >= 3 && (
        <div className="flex flex-col items-center gap-6">
          <div className="skull-pulse" style={{ fontSize: "clamp(6rem, 30vw, 20rem)", lineHeight: 1 }}>
            💀
          </div>
          {phase >= 4 && (
            <div
              className="fadein text-center font-black text-white"
              style={{ fontSize: "clamp(1.5rem, 6vw, 4rem)" }}
            >
              Jaber Has Joined
            </div>
          )}
        </div>
      )}
    </div>
  );
}
