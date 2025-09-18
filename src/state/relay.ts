import { io, Socket } from "socket.io-client";
import type {
  JoinReq, JoinedEvt, PresenceEvt, SnapshotEvt,
  ChatReq, ChatEvt, StateSetReq, StatePatchReq, ErrorEvt
} from "./types";

export class RelayClient {
  private socket!: Socket;
  private _roomId: string | null = null;
  private _playerId: string | null = null;

  get connected() { return this.socket?.connected ?? false; }
  get roomId() { return this._roomId; }
  get playerId() { return this._playerId; }

  init(url = "http://localhost:3000") {
    if (this.socket) return; // idempotent
    this.socket = io(url, {
      transports: ["websocket"], // faster dev loop
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 300,
      reconnectionDelayMax: 3000,
    });

    // Optional: log connection issues in dev
    this.socket.on("connect_error", (e) => console.warn("[relay] connect_error", e.message));
    this.socket.on("disconnect", (r) => console.log("[relay] disconnected", r));
  }

  // ---- API: client -> server ----
  join(payload: JoinReq) { this.socket.emit("room:join", payload); }
  leave() { this.socket.emit("room:leave"); this._roomId = null; this._playerId = null; }
  stateSet(req: StateSetReq) { this.socket.emit("state:set", req); }
  statePatch(req: StatePatchReq) { this.socket.emit("state:patch", req); }
  stateGet() { this.socket.emit("state:get"); }
  chat(req: ChatReq) { this.socket.emit("chat:msg", req); }

  // ---- API: subscriptions (server -> client) ----
  onJoined(fn: (e: JoinedEvt) => void) { this.socket.on("room:joined", (e: JoinedEvt) => { this._roomId = e.roomId; this._playerId = e.playerId; fn(e); }); }
  onPresence(fn: (e: PresenceEvt) => void) { this.socket.on("room:presence", fn); }
  onSnapshot(fn: (e: SnapshotEvt) => void) { this.socket.on("room:snapshot", fn); }
  onChat(fn: (e: ChatEvt) => void) { this.socket.on("chat:msg", fn); }
  onError(fn: (e: ErrorEvt) => void) { this.socket.on("error", fn); }
}

export const relay = new RelayClient();
