import type { Agent, Message, Room, Task } from "@multi-agent-communicate/protocol";

import { BusClient } from "./bus-client.js";
import { OpenClawInboundHandler } from "./inbound-handler.js";
import { OpenClawIdentityMapper } from "./mapper.js";
import { OpenClawOutboundHandler } from "./outbound-handler.js";
import type { OpenClawRuntimeBridge, RuntimeMountOptions } from "./runtime-bridge.js";
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
  private detachRuntimeListener: (() => void) | null = null;
  private detachRealtimeListener: (() => void) | null = null;
  private mountedRuntime: OpenClawRuntimeBridge | null = null;

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

  async syncInbox(botId: string): Promise<OpenClawInboundEvent[]> {
    const agentId = this.mapper.toAgentId(botId);
    const messages = await this.busClient.listInboxMessages(agentId);
    return messages.map((message) => this.handleInbound(message));
  }

  async syncRoom(roomId: string): Promise<OpenClawInboundEvent[]> {
    const messages = await this.busClient.listRoomMessages(roomId);
    return messages.map((message) => this.handleInbound(message));
  }

  async syncTaskMessages(taskId: string): Promise<OpenClawInboundEvent[]> {
    const messages = await this.busClient.listTaskMessages(taskId);
    return messages.map((message) => this.handleInbound(message));
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

  async unsubscribeRoom(roomId: string): Promise<void> {
    if (!this.busWebSocketClient) {
      throw new Error("Realtime client is not configured");
    }

    await this.busWebSocketClient.unsubscribeRoom(roomId);
  }

  async unsubscribeInbox(botId: string): Promise<void> {
    if (!this.busWebSocketClient) {
      throw new Error("Realtime client is not configured");
    }

    await this.busWebSocketClient.unsubscribeInbox(this.mapper.toAgentId(botId));
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

  async mountRuntime(
    runtime: OpenClawRuntimeBridge,
    options: RuntimeMountOptions = {},
  ): Promise<void> {
    this.mountedRuntime = runtime;
    const bots = await runtime.listBots();

    for (const bot of bots) {
      await this.registerBot(bot);
    }

    await this.connectRealtime();

    for (const bot of bots) {
      await this.subscribeInbox(bot.botId);
    }

    for (const roomId of options.subscribeRooms ?? []) {
      await this.subscribeRoom(roomId);
    }

    this.detachRealtimeListener?.();
    this.detachRealtimeListener = this.onRealtimeEvent(async (event) => {
      await runtime.deliverInboundEvent(event);
    });

    this.detachRuntimeListener?.();
    this.detachRuntimeListener = runtime.onOutboundAction(async (action) => {
      await this.handleOutbound(action);
    });

    if (options.syncInboxOnMount) {
      for (const bot of bots) {
        const events = await this.syncInbox(bot.botId);

        if (!options.replaySyncedEvents) {
          continue;
        }

        for (const event of events) {
          await runtime.deliverInboundEvent(event);
        }
      }
    }

    await runtime.onMounted?.();
  }

  async unmountRuntime(): Promise<void> {
    this.detachRuntimeListener?.();
    this.detachRuntimeListener = null;
    this.detachRealtimeListener?.();
    this.detachRealtimeListener = null;
    this.disconnectRealtime();
    await this.mountedRuntime?.onUnmounted?.();
    this.mountedRuntime = null;
  }
}
