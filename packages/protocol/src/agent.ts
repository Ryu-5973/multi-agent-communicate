import { z } from "zod";

export const runtimeSchema = z.enum([
  "openclaw",
  "codex-cli",
  "claude-code",
  "gemini-cli",
  "custom",
]);

export const agentCapabilitySchema = z.enum([
  "planner",
  "code",
  "review",
  "search",
  "ops",
  "custom",
]);

export const agentStatusSchema = z.enum(["online", "offline", "busy"]);

export const agentSchema = z.object({
  id: z.string().min(1),
  runtime: runtimeSchema,
  name: z.string().min(1),
  capabilities: z.array(agentCapabilitySchema).default([]),
  status: agentStatusSchema.default("online"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type Runtime = z.infer<typeof runtimeSchema>;
export type AgentCapability = z.infer<typeof agentCapabilitySchema>;
export type AgentStatus = z.infer<typeof agentStatusSchema>;
export type Agent = z.infer<typeof agentSchema>;
