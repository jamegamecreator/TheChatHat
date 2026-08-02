"use client";
import { useRef, useState, useEffect } from "react";
import { CloseIcon, BoardIcon } from "./Icons";

export default function WhiteboardDrawer({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (content: string, type: string) => void;
}) {
  const [mode, setMode] = useState<"draw" | "code">("draw");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#2563eb");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const share = () => {
    if (mode === "draw") {
      const data = canvasRef.current!.toDataURL("image/png");
      onSend(data, "image");
    } else if (code.trim()) {
      onSend("```\n" + code + "\n```", "text");
    }
  };

  return (
    <div className="fixed inset-0 z-[9992] flex items-end sm:items-center sm:justify-end bg-black/40" onClick={onClose}>
      <div className="h-[80vh] w-full rounded-t-2xl border sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl" style={{ background: "var(--panel)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 font-bold"><BoardIcon width={18} height={18} /> Canvas</div>
          <button onClick={onClose}><CloseIcon width={20} height={20} /></button>
        </div>
        <div className="flex gap-1 px-4 py-2">
          <button onClick={() => setMode("draw")} className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: mode === "draw" ? "var(--accent)" : "var(--panel-2)", color: mode === "draw" ? "var(--accent-contrast)" : "var(--text)" }}>✏️ Draw</button>
          <button onClick={() => setMode("code")} className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: mode === "code" ? "var(--accent)" : "var(--panel-2)", color: mode === "code" ? "var(--accent-contrast)" : "var(--text)" }}>{"</>"} Code</button>
        </div>
        <div className="px-4">
          {mode === "draw" ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                {["#2563eb", "#ef4444", "#22c55e", "#000000", "#f59e0b"].map((c) => (
                  <button key={c} onClick={() => setColor(c)} className="h-6 w-6 rounded-full border-2" style={{ background: c, borderColor: color === c ? "var(--text)" : "transparent" }} />
                ))}
                <button onClick={clear} className="ml-auto text-xs underline" style={{ color: "var(--muted)" }}>Clear</button>
              </div>
              <canvas
                ref={canvasRef}
                width={480}
                height={360}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerLeave={end}
                className="w-full touch-none rounded-lg border"
                style={{ aspectRatio: "4/3" }}
              />
            </>
          ) : (
            <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="// paste code to share" className="h-64 w-full resize-none rounded-lg border p-3 font-mono text-sm outline-none" style={{ background: "var(--panel-2)", color: "var(--text)" }} />
          )}
        </div>
        <div className="p-4">
          <button onClick={share} className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Share to chat</button>
        </div>
      </div>
    </div>
  );
}
