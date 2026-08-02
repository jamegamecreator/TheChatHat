import { EventEmitter } from "events";

export type BusEvent = {
  type: string;
  payload: unknown;
  channelId?: string;
};

const globalForBus = globalThis as typeof globalThis & {
  __chatHatBus?: EventEmitter;
  __chatHatPresence?: Map<string, number>;
  __chatHatKeylog?: boolean;
};

export const bus =
  globalForBus.__chatHatBus ??
  (() => {
    const e = new EventEmitter();
    e.setMaxListeners(10000);
    return e;
  })();

export const presence =
  globalForBus.__chatHatPresence ?? new Map<string, number>();

globalForBus.__chatHatBus = bus;
globalForBus.__chatHatPresence = presence;

export function broadcast(event: BusEvent) {
  bus.emit("event", event);
}

export function heartbeat(name: string) {
  presence.set(name, Date.now());
}

export function onlineUsers(): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (const [name, ts] of presence.entries()) {
    if (now - ts < 20000) out.push(name);
    else presence.delete(name);
  }
  return out;
}
