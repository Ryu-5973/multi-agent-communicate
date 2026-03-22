import { agentSchema } from "@multi-agent-communicate/protocol";
import type { FastifyInstance } from "fastify";

import { AgentService } from "../services/agent-service.js";

export function registerAgentRoutes(app: FastifyInstance, agentService: AgentService): void {
  app.get("/agents", async () => {
    return { items: agentService.list() };
  });

  app.get<{ Params: { id: string } }>("/agents/:id", async (request, reply) => {
    const agent = agentService.get(request.params.id);

    if (!agent) {
      return reply.code(404).send({ message: "Agent not found" });
    }

    return agent;
  });

  app.post("/agents", async (request, reply) => {
    const parsed = agentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid agent payload", issues: parsed.error.issues });
    }

    return reply.code(201).send(agentService.register(parsed.data));
  });
}
