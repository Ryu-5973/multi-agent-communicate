import type { BusServerEvent, BusSubscriptionCommand, BusWebSocketConfig } from "./types.js";

type EventListener = (event: BusServerEvent) => void;

export class BusWebSocketClient {
  private readonly url: string;
  private readonly webSocketImpl: typeof WebSocket;
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<EventListener>();

  constructor(config: BusWebSocketConfig) {
    this.url = config.url;
    this.webSocketImpl = config.webSocketImpl ?? WebSocket;
  }

  async connect(): Promise<void> {
    if (this.socket && this.socket.readyState === this.webSocketImpl.OPEN) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new this.webSocketImpl(this.url);

      const onOpen = () => {
        socket.removeEventListener("error", onError);
        this.socket = socket;
        this.bindSocket(socket);
        resolve();
      };

      const onError = () => {
        socket.removeEventListener("open", onOpen);
        reject(new Error(`Failed to connect websocket: ${this.url}`));
      };

      socket.addEventListener("open", onOpen, { once: true });
      socket.addEventListener("error", onError, { once: true });
    });
  }

  async subscribeRoom(roomId: string): Promise<void> {
    await this.send({
      action: "subscribe.room",
      roomId,
    });
  }

  async unsubscribeRoom(roomId: string): Promise<void> {
    await this.send({
      action: "unsubscribe.room",
      roomId,
    });
  }

  async subscribeInbox(agentId: string): Promise<void> {
    await this.send({
      action: "subscribe.inbox",
      agentId,
    });
  }

  async unsubscribeInbox(agentId: string): Promise<void> {
    await this.send({
      action: "unsubscribe.inbox",
      agentId,
    });
  }

  onEvent(listener: EventListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  disconnect(code?: number): void {
    this.socket?.close(code);
    this.socket = null;
  }

  private bindSocket(socket: WebSocket): void {
    socket.addEventListener("message", (event) => {
      const parsed = this.parseEvent(event.data);

      if (!parsed) {
        return;
      }

      for (const listener of this.listeners) {
        listener(parsed);
      }
    });

    socket.addEventListener("close", () => {
      if (this.socket === socket) {
        this.socket = null;
      }
    });
  }

  private async send(command: BusSubscriptionCommand): Promise<void> {
    await this.connect();

    if (!this.socket || this.socket.readyState !== this.webSocketImpl.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.socket.send(JSON.stringify(command));
  }

  private parseEvent(data: unknown): BusServerEvent | null {
    if (typeof data !== "string") {
      return null;
    }

    try {
      return JSON.parse(data) as BusServerEvent;
    } catch {
      return null;
    }
  }
}
