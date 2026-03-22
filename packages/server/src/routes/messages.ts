import { messageSchema } from "@multi-agent-communicate/protocol";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { MessageService } from "../services/message-service.js";

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

export function registerMessageRoutes(
  app: FastifyInstance,
  messageService: MessageService,
): void {
  app.get("/messages", async () => {
    return { items: messageService.listAll() };
  });

  app.get<{ Params: { id: string } }>("/rooms/:id/messages", async (request, reply) => {
    const parsed = historyQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", issues: parsed.error.issues });
    }

    return { items: messageService.listRoomMessages(request.params.id, parsed.data.limit) };
  });

  app.get<{ Params: { id: string } }>("/agents/:id/inbox", async (request, reply) => {
    const parsed = historyQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", issues: parsed.error.issues });
    }

    return { items: messageService.listDirectMessages(request.params.id, parsed.data.limit) };
  });

  app.get<{ Params: { id: string } }>("/tasks/:id/messages", async (request, reply) => {
    const parsed = historyQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", issues: parsed.error.issues });
    }

    return { items: messageService.listTaskMessages(request.params.id, parsed.data.limit) };
  });

  app.post("/messages", async (request, reply) => {
    const parsed = messageSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: "Invalid message payload",
        issues: parsed.error.issues,
      });
    }

    return reply.code(201).send(messageService.publish(parsed.data));
  });
}
