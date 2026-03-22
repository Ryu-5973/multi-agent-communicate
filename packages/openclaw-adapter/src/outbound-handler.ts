import { createMessage } from "@multi-agent-communicate/protocol";
import type { Message, MessageTarget } from "@multi-agent-communicate/protocol";

import { OpenClawIdentityMapper } from "./mapper.js";
import type { OpenClawOutboundAction } from "./types.js";

export class OpenClawOutboundHandler {
  constructor(private readonly mapper: OpenClawIdentityMapper) {}

  toMessage(action: OpenClawOutboundAction): Message {
    const target = this.toMessageTarget(action.target);
    const from = this.mapper.toAgentId(action.fromBotId);

    switch (action.type) {
      case "chat":
        return createMessage({
          id: action.messageId,
          from,
          target,
          type: "chat",
          timestamp: action.timestamp,
          correlationId: action.correlationId ?? null,
          metadata: action.metadata,
          content: {
            kind: "chat",
            text: action.text,
            data: {},
          },
        });
      case "ask":
        return createMessage({
          id: action.messageId,
          from,
          target,
          type: "ask",
          timestamp: action.timestamp,
          correlationId: action.correlationId ?? null,
          metadata: action.metadata,
          content: {
            kind: "ask",
            text: action.text,
            data: {},
          },
        });
      case "answer":
        return createMessage({
          id: action.messageId,
          from,
          target,
          type: "answer",
          timestamp: action.timestamp,
          correlationId: action.correlationId ?? null,
          metadata: action.metadata,
          content: {
            kind: "answer",
            text: action.text,
            data: {},
          },
        });
      case "task.assign":
        return createMessage({
          id: action.messageId,
          from,
          target,
          type: "task.assign",
          timestamp: action.timestamp,
          correlationId: action.correlationId ?? null,
          taskId: action.task.id,
          metadata: action.metadata,
          content: {
            kind: "task.assign",
            text: action.text,
            data: {},
            task: action.task,
          },
        });
      case "task.update":
        return createMessage({
          id: action.messageId,
          from,
          target,
          type: "task.update",
          timestamp: action.timestamp,
          correlationId: action.correlationId ?? null,
          taskId: action.taskId,
          metadata: action.metadata,
          content: {
            kind: "task.update",
            text: action.text,
            data: {},
            update: action.update,
          },
        });
      case "task.done":
        return createMessage({
          id: action.messageId,
          from,
          target,
          type: "task.done",
          timestamp: action.timestamp,
          correlationId: action.correlationId ?? null,
          taskId: action.taskId,
          metadata: action.metadata,
          content: {
            kind: "task.done",
            text: action.text,
            data: {},
            result: action.result,
          },
        });
    }
  }

  private toMessageTarget(target: OpenClawOutboundAction["target"]): MessageTarget {
    if (target.mode === "room") {
      return {
        mode: "room",
        roomId: target.roomId,
      };
    }

    return {
      mode: "direct",
      to: target.agentId,
    };
  }
}
