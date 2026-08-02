"use client";
import { useRef, useState, useEffect } from "react";
import { PlayIcon, PauseIcon } from "./Icons";

export default function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // stable pseudo-random bars
  const bars = useRef<number[]>(
    Array.from({ length: 34 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.7)) * 0.75)
  );

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "var(--panel-2)" }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
      >
        {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
      </button>
      <div className="flex h-8 flex-1 items-center gap-[2px]">
        {bars.current.map((h, i) => {
          const active = i / bars.current.length <= progress;
          return (
            <div
              key={i}
              className="w-full rounded-full transition-colors"
              style={{
                height: `${h * 100}%`,
                background: active ? "var(--accent)" : "var(--border)",
                minWidth: 2,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
