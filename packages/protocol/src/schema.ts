import { z } from "zod";

import { agentSchema } from "./agent.js";
import { messageSchema } from "./message.js";
import { roomSchema } from "./room.js";
import { taskSchema } from "./task.js";

const baseProtocolEventSchema = z.object({
  emittedAt: z.string().datetime(),
});

export const agentRegisteredEventSchema = baseProtocolEventSchema.extend({
  event: z.literal("agent.registered"),
  agent: agentSchema,
});

export const roomCreatedEventSchema = baseProtocolEventSchema.extend({
  event: z.literal("room.created"),
  room: roomSchema,
});

export const roomJoinedEventSchema = baseProtocolEventSchema.extend({
  event: z.literal("room.joined"),
  roomId: z.string().min(1),
  agentId: z.string().min(1),
});

export const taskTrackedEventSchema = baseProtocolEventSchema.extend({
  event: z.literal("task.tracked"),
  task: taskSchema,
});

export const messagePublishedEventSchema = baseProtocolEventSchema.extend({
  event: z.literal("message.published"),
  message: messageSchema,
});

export const protocolEventSchema = z.discriminatedUnion("event", [
  agentRegisteredEventSchema,
  roomCreatedEventSchema,
  roomJoinedEventSchema,
  taskTrackedEventSchema,
  messagePublishedEventSchema,
]);

export const protocolEnvelopeSchema = z.object({
  version: z.literal("v1"),
  event: protocolEventSchema,
});

export type AgentRegisteredEvent = z.infer<typeof agentRegisteredEventSchema>;
export type RoomCreatedEvent = z.infer<typeof roomCreatedEventSchema>;
export type RoomJoinedEvent = z.infer<typeof roomJoinedEventSchema>;
export type TaskTrackedEvent = z.infer<typeof taskTrackedEventSchema>;
export type MessagePublishedEvent = z.infer<typeof messagePublishedEventSchema>;
export type ProtocolEvent = z.infer<typeof protocolEventSchema>;
export type ProtocolEnvelope = z.infer<typeof protocolEnvelopeSchema>;
