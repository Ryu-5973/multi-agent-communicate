import type { Agent, Message, Room, Task } from "@multi-agent-communicate/protocol";

import { BusClient } from "./bus-client.js";
import { OpenClawInboundHandler } from "./inbound-handler.js";
import { OpenClawIdentityMapper } from "./mapper.js";
import { OpenClawOutboundHandler } from "./outbound-handler.js";
import type {
  BusClientConfig,
  BusWebSocketConfig,
  OpenClawBotDescriptor,
  OpenClawInboundEvent,
  OpenClawOutboundAction,
} from "./types.js";
import { BusWebSocketClient } from "./ws-client.js";

export class OpenClawAdapterPlugin {
  private readonly mapper = new OpenClawIdentityMapper();
  private readonly busClient: BusClient;
  private readonly outboundHandler: OpenClawOutboundHandler;
  private readonly inboundHandler: OpenClawInboundHandler;
  private readonly busWebSocketClient: BusWebSocketClient | null;

  constructor(config: BusClientConfig, websocketConfig?: BusWebSocketConfig) {
    this.busClient = new BusClient(config);
    this.outboundHandler = new OpenClawOutboundHandler(this.mapper);
    this.inboundHandler = new OpenClawInboundHandler(this.mapper);
    this.busWebSocketClient = websocketConfig ? new BusWebSocketClient(websocketConfig) : null;
  }

  async registerBot(bot: OpenClawBotDescriptor): Promise<Agent> {
    const agent = this.mapper.toAgent(bot);
    return this.busClient.registerAgent(agent);
  }

  async ensureRoom(room: Room): Promise<Room> {
    return this.busClient.createRoom(room);
  }

  async joinRoom(roomId: string, botId: string): Promise<Room> {
    return this.busClient.joinRoom(roomId, this.mapper.toAgentId(botId));
  }

  async trackTask(task: Task): Promise<Task> {
    return this.busClient.createTask(task);
  }

  async handleOutbound(action: OpenClawOutboundAction): Promise<Message> {
    const message = this.outboundHandler.toMessage(action);
    return this.busClient.publishMessage(message);
  }

  handleInbound(message: Message): OpenClawInboundEvent {
    return this.inboundHandler.toInboundEvent(message);
  }

  async connectRealtime(): Promise<void> {
    await this.busWebSocketClient?.connect();
  }

  async subscribeRoom(roomId: string): Promise<void> {
    if (!this.busWebSocketClient) {
      throw new Error("Realtime client is not configured");
    }

    await this.busWebSocketClient.subscribeRoom(roomId);
  }

  async subscribeInbox(botId: string): Promise<void> {
    if (!this.busWebSocketClient) {
      throw new Error("Realtime client is not configured");
    }

    await this.busWebSocketClient.subscribeInbox(this.mapper.toAgentId(botId));
  }

  onRealtimeEvent(listener: (event: OpenClawInboundEvent) => void): () => void {
    if (!this.busWebSocketClient) {
      throw new Error("Realtime client is not configured");
    }

    return this.busWebSocketClient.onEvent((event) => {
      if (event.type !== "message.published") {
        return;
      }

      listener(this.handleInbound(event.message));
    });
  }

  disconnectRealtime(code?: number): void {
    this.busWebSocketClient?.disconnect(code);
  }
}
