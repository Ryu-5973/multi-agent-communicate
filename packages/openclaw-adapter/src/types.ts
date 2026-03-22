import type { Agent, Message, MessageTarget, TaskPriority, TaskStatus } from "@multi-agent-communicate/protocol";

export type OpenClawBotDescriptor = {
  botId: string;
  name: string;
  capabilities?: Agent["capabilities"];
  metadata?: Record<string, unknown>;
};

export type OpenClawTarget =
  | {
      mode: "room";
      roomId: string;
    }
  | {
      mode: "direct";
      agentId: string;
    };

export type OpenClawOutboundAction =
  | {
      type: "chat";
      messageId: string;
      fromBotId: string;
      target: OpenClawTarget;
      text: string;
      timestamp: string;
      correlationId?: string | null;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "ask";
      messageId: string;
      fromBotId: string;
      target: OpenClawTarget;
      text: string;
      timestamp: string;
      correlationId?: string | null;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "answer";
      messageId: string;
      fromBotId: string;
      target: OpenClawTarget;
      text: string;
      timestamp: string;
      correlationId?: string | null;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "task.assign";
      messageId: string;
      fromBotId: string;
      target: OpenClawTarget;
      text: string;
      timestamp: string;
      task: {
        id: string;
        title: string;
        detail: string;
        assignedTo: string;
        priority: TaskPriority;
      };
      correlationId?: string | null;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "task.update";
      messageId: string;
      fromBotId: string;
      target: OpenClawTarget;
      text: string;
      timestamp: string;
      taskId: string;
      update: {
        status: TaskStatus;
        progress: string;
      };
      correlationId?: string | null;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "task.done";
      messageId: string;
      fromBotId: string;
      target: OpenClawTarget;
      text: string;
      timestamp: string;
      taskId: string;
      result: {
        summary: string;
        output?: string;
      };
      correlationId?: string | null;
      metadata?: Record<string, unknown>;
    };

export type OpenClawInboundEvent = {
  kind: "bus.message";
  toBotId: string | null;
  message: Message;
  prompt: string;
  target: MessageTarget;
};

export type BusClientConfig = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

export type BusWebSocketConfig = {
  url: string;
  webSocketImpl?: typeof WebSocket;
};

export type BusSubscriptionCommand =
  | {
      action: "subscribe.room";
      roomId: string;
    }
  | {
      action: "unsubscribe.room";
      roomId: string;
    }
  | {
      action: "subscribe.inbox";
      agentId: string;
    }
  | {
      action: "unsubscribe.inbox";
      agentId: string;
    }
  | {
      action: "ping";
    };

export type BusServerEvent =
  | { type: "subscribed.room"; roomId: string }
  | { type: "unsubscribed.room"; roomId: string }
  | { type: "subscribed.inbox"; agentId: string }
  | { type: "unsubscribed.inbox"; agentId: string }
  | { type: "pong" }
  | { type: "message.published"; message: Message }
  | { type: "error"; message: string };
