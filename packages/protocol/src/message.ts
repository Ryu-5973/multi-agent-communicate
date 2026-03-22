import { z } from "zod";

const roomTargetSchema = z.object({
  mode: z.literal("room"),
  roomId: z.string().min(1),
});

const directTargetSchema = z.object({
  mode: z.literal("direct"),
  to: z.string().min(1),
});

export const messageTargetSchema = z.discriminatedUnion("mode", [
  roomTargetSchema,
  directTargetSchema,
]);

export const messageTypeSchema = z.enum([
  "chat",
  "task.assign",
  "task.update",
  "task.done",
  "ask",
  "answer",
  "system",
]);

export const baseMessageContentSchema = z.object({
  text: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const chatMessageContentSchema = baseMessageContentSchema.extend({
  kind: z.literal("chat"),
});

export const askMessageContentSchema = baseMessageContentSchema.extend({
  kind: z.literal("ask"),
});

export const answerMessageContentSchema = baseMessageContentSchema.extend({
  kind: z.literal("answer"),
});

export const systemMessageContentSchema = baseMessageContentSchema.extend({
  kind: z.literal("system"),
});

export const taskAssignMessageContentSchema = z.object({
  kind: z.literal("task.assign"),
  text: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  task: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    detail: z.string().min(1),
    assignedTo: z.string().min(1),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
  }),
});

export const taskUpdateMessageContentSchema = z.object({
  kind: z.literal("task.update"),
  text: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  update: z.object({
    status: z.enum(["queued", "running", "blocked", "done"]),
    progress: z.string().min(1),
  }),
});

export const taskDoneMessageContentSchema = z.object({
  kind: z.literal("task.done"),
  text: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  result: z.object({
    summary: z.string().min(1),
    output: z.string().optional(),
  }),
});

export const messageContentSchema = z.discriminatedUnion("kind", [
  chatMessageContentSchema,
  askMessageContentSchema,
  answerMessageContentSchema,
  systemMessageContentSchema,
  taskAssignMessageContentSchema,
  taskUpdateMessageContentSchema,
  taskDoneMessageContentSchema,
]);

const baseMessageSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  target: messageTargetSchema,
  timestamp: z.string().datetime(),
  correlationId: z.string().min(1).nullable().default(null),
  taskId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const chatMessageSchema = baseMessageSchema.extend({
  type: z.literal("chat"),
  content: chatMessageContentSchema,
});

export const askMessageSchema = baseMessageSchema.extend({
  type: z.literal("ask"),
  content: askMessageContentSchema,
});

export const answerMessageSchema = baseMessageSchema.extend({
  type: z.literal("answer"),
  content: answerMessageContentSchema,
});

export const systemMessageSchema = baseMessageSchema.extend({
  type: z.literal("system"),
  content: systemMessageContentSchema,
});

export const taskAssignMessageSchema = baseMessageSchema.extend({
  type: z.literal("task.assign"),
  taskId: z.string().min(1),
  content: taskAssignMessageContentSchema,
});

export const taskUpdateMessageSchema = baseMessageSchema.extend({
  type: z.literal("task.update"),
  taskId: z.string().min(1),
  content: taskUpdateMessageContentSchema,
});

export const taskDoneMessageSchema = baseMessageSchema.extend({
  type: z.literal("task.done"),
  taskId: z.string().min(1),
  content: taskDoneMessageContentSchema,
});

export const messageSchema = z.discriminatedUnion("type", [
  chatMessageSchema,
  askMessageSchema,
  answerMessageSchema,
  systemMessageSchema,
  taskAssignMessageSchema,
  taskUpdateMessageSchema,
  taskDoneMessageSchema,
]);

export type MessageTarget = z.infer<typeof messageTargetSchema>;
export type MessageType = z.infer<typeof messageTypeSchema>;
export type MessageContent = z.infer<typeof messageContentSchema>;
export type Message = z.infer<typeof messageSchema>;
