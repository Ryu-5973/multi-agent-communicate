import type { Agent } from "./agent.js";
import type { Message, MessageContent, MessageTarget, MessageType } from "./message.js";
import type {
  AgentRegisteredEvent,
  MessagePublishedEvent,
  ProtocolEnvelope,
  ProtocolEvent,
  RoomCreatedEvent,
  RoomJoinedEvent,
  TaskTrackedEvent,
} from "./schema.js";
import type { Room } from "./room.js";
import type { Task } from "./task.js";

type BaseMessageInput = {
  id: string;
  from: string;
  target: MessageTarget;
  timestamp: string;
  correlationId?: string | null;
  taskId?: string;
  metadata?: Record<string, unknown>;
};

type MessageContentByType = {
  chat: Extract<MessageContent, { kind: "chat" }>;
  ask: Extract<MessageContent, { kind: "ask" }>;
  answer: Extract<MessageContent, { kind: "answer" }>;
  system: Extract<MessageContent, { kind: "system" }>;
  "task.assign": Extract<MessageContent, { kind: "task.assign" }>;
  "task.update": Extract<MessageContent, { kind: "task.update" }>;
  "task.done": Extract<MessageContent, { kind: "task.done" }>;
};

export function createMessage<TType extends MessageType>(
  input: BaseMessageInput & {
    type: TType;
    content: MessageContentByType[TType];
  },
): Extract<Message, { type: TType }> {
  return {
    id: input.id,
    from: input.from,
    target: input.target,
    type: input.type,
    timestamp: input.timestamp,
    content: input.content,
    correlationId: input.correlationId ?? null,
    ...(input.taskId ? { taskId: input.taskId } : {}),
    metadata: input.metadata ?? {},
  } as Extract<Message, { type: TType }>;
}

export function createAgentRegisteredEvent(
  agent: Agent,
  emittedAt: string,
): AgentRegisteredEvent {
  return {
    event: "agent.registered",
    emittedAt,
    agent,
  };
}

export function createRoomCreatedEvent(room: Room, emittedAt: string): RoomCreatedEvent {
  return {
    event: "room.created",
    emittedAt,
    room,
  };
}

export function createRoomJoinedEvent(
  roomId: string,
  agentId: string,
  emittedAt: string,
): RoomJoinedEvent {
  return {
    event: "room.joined",
    emittedAt,
    roomId,
    agentId,
  };
}

export function createTaskTrackedEvent(task: Task, emittedAt: string): TaskTrackedEvent {
  return {
    event: "task.tracked",
    emittedAt,
    task,
  };
}

export function createMessagePublishedEvent(
  message: Message,
  emittedAt: string,
): MessagePublishedEvent {
  return {
    event: "message.published",
    emittedAt,
    message,
  };
}

export function createEnvelope(event: ProtocolEvent): ProtocolEnvelope {
  return {
    version: "v1",
    event,
  };
}
