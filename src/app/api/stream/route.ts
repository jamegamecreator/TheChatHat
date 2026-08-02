import { bus, heartbeat, onlineUsers, broadcast, BusEvent } from "@/lib/bus";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const auth = verifyToken(token);
  const name = auth?.name;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          /* ignore */
        }
      };

      send("ready", { online: onlineUsers() });

      const listener = (evt: BusEvent) => {
        send("bus", evt);
      };
      bus.on("event", listener);

      const beat = setInterval(() => {
        if (name) {
          heartbeat(name);
        }
        send("ping", { t: Date.now() });
      }, 8000);

      const presenceTick = setInterval(() => {
        if (name) heartbeat(name);
      }, 5000);

      if (name) {
        heartbeat(name);
        broadcast({ type: "presence", payload: { online: onlineUsers() } });
      }

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(beat);
        clearInterval(presenceTick);
        bus.off("event", listener);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
