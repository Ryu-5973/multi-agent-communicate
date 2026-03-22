import websocket from "@fastify/websocket";
import type { Message } from "@multi-agent-communicate/protocol";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const clientCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe.room"),
    roomId: z.string().min(1),
  }),
  z.object({
    action: z.literal("unsubscribe.room"),
    roomId: z.string().min(1),
  }),
  z.object({
    action: z.literal("subscribe.inbox"),
    agentId: z.string().min(1),
  }),
  z.object({
    action: z.literal("unsubscribe.inbox"),
    agentId: z.string().min(1),
  }),
  z.object({
    action: z.literal("ping"),
  }),
]);

type SocketLike = {
  send: (data: string) => void;
  close: (code?: number) => void;
  on: (event: "message" | "close" | "error", listener: (...args: unknown[]) => void) => void;
  readyState: number;
};

type ServerEvent =
  | { type: "subscribed.room"; roomId: string }
  | { type: "unsubscribed.room"; roomId: string }
  | { type: "subscribed.inbox"; agentId: string }
  | { type: "unsubscribed.inbox"; agentId: string }
  | { type: "pong" }
  | { type: "message.published"; message: Message }
  | { type: "error"; message: string };

type ClientState = {
  rooms: Set<string>;
  inboxes: Set<string>;
};

export class WebSocketGateway {
  private readonly roomSubscribers = new Map<string, Set<SocketLike>>();
  private readonly inboxSubscribers = new Map<string, Set<SocketLike>>();
  private readonly clientStates = new Map<SocketLike, ClientState>();

  async register(app: FastifyInstance): Promise<void> {
    await app.register(websocket);

    app.get("/ws", { websocket: true }, (connection) => {
      const socket = connection;
      this.clientStates.set(socket, {
        rooms: new Set(),
        inboxes: new Set(),
      });

      socket.on("message", (raw: unknown) => {
        const text = this.normalizeIncoming(raw);
        const parsedJson = this.parseJson(text);

        if (!parsedJson) {
          this.send(socket, { type: "error", message: "Invalid JSON payload" });
          return;
        }

        const command = clientCommandSchema.safeParse(parsedJson);

        if (!command.success) {
          this.send(socket, { type: "error", message: "Invalid websocket command" });
          return;
        }

        this.handleCommand(socket, command.data);
      });

      socket.on("close", () => {
        this.cleanupSocket(socket);
      });

      socket.on("error", () => {
        this.cleanupSocket(socket);
      });
    });
  }

  publish(message: Message): void {
    if (message.target.mode === "room") {
      const subscribers = this.roomSubscribers.get(message.target.roomId) ?? new Set();
      for (const socket of subscribers) {
        this.send(socket, { type: "message.published", message });
      }
      return;
    }

    const subscribers = this.inboxSubscribers.get(message.target.to) ?? new Set();
    for (const socket of subscribers) {
      this.send(socket, { type: "message.published", message });
    }
  }

  private handleCommand(socket: SocketLike, command: z.infer<typeof clientCommandSchema>): void {
    switch (command.action) {
      case "subscribe.room":
        this.subscribeRoom(socket, command.roomId);
        this.send(socket, { type: "subscribed.room", roomId: command.roomId });
        return;
      case "unsubscribe.room":
        this.unsubscribeRoom(socket, command.roomId);
        this.send(socket, { type: "unsubscribed.room", roomId: command.roomId });
        return;
      case "subscribe.inbox":
        this.subscribeInbox(socket, command.agentId);
        this.send(socket, { type: "subscribed.inbox", agentId: command.agentId });
        return;
      case "unsubscribe.inbox":
        this.unsubscribeInbox(socket, command.agentId);
        this.send(socket, { type: "unsubscribed.inbox", agentId: command.agentId });
        return;
      case "ping":
        this.send(socket, { type: "pong" });
        return;
    }
  }

  private subscribeRoom(socket: SocketLike, roomId: string): void {
    const subscribers = this.roomSubscribers.get(roomId) ?? new Set<SocketLike>();
    subscribers.add(socket);
    this.roomSubscribers.set(roomId, subscribers);
    this.clientStates.get(socket)?.rooms.add(roomId);
  }

  private unsubscribeRoom(socket: SocketLike, roomId: string): void {
    this.roomSubscribers.get(roomId)?.delete(socket);
    this.clientStates.get(socket)?.rooms.delete(roomId);
  }

  private subscribeInbox(socket: SocketLike, agentId: string): void {
    const subscribers = this.inboxSubscribers.get(agentId) ?? new Set<SocketLike>();
    subscribers.add(socket);
    this.inboxSubscribers.set(agentId, subscribers);
    this.clientStates.get(socket)?.inboxes.add(agentId);
  }

  private unsubscribeInbox(socket: SocketLike, agentId: string): void {
    this.inboxSubscribers.get(agentId)?.delete(socket);
    this.clientStates.get(socket)?.inboxes.delete(agentId);
  }

  private cleanupSocket(socket: SocketLike): void {
    const state = this.clientStates.get(socket);

    if (!state) {
      return;
    }

    for (const roomId of state.rooms) {
      this.roomSubscribers.get(roomId)?.delete(socket);
    }

    for (const agentId of state.inboxes) {
      this.inboxSubscribers.get(agentId)?.delete(socket);
    }

    this.clientStates.delete(socket);
  }

  private send(socket: SocketLike, event: ServerEvent): void {
    if (socket.readyState !== 1) {
      return;
    }

    socket.send(JSON.stringify(event));
  }

  private normalizeIncoming(raw: unknown): string {
    if (typeof raw === "string") {
      return raw;
    }

    if (raw instanceof Buffer) {
      return raw.toString("utf8");
    }

    return "";
  }

  private parseJson(text: string): unknown | null {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}
