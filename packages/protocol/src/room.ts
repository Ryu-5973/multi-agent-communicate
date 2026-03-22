import { z } from "zod";

export const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string().min(1),
  participants: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type Room = z.infer<typeof roomSchema>;
