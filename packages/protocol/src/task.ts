import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);
export const taskStatusSchema = z.enum(["queued", "running", "blocked", "done"]);

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  assignedTo: z.string().min(1),
  status: taskStatusSchema.default("queued"),
  priority: taskPrioritySchema.default("medium"),
  result: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type Task = z.infer<typeof taskSchema>;
