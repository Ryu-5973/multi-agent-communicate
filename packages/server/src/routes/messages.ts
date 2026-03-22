import { messageSchema } from "@multi-agent-communicate/protocol";
import type { FastifyInstance } from "fastify";

import { MessageService } from "../services/message-service.js";

export function registerMessageRoutes(
  app: FastifyInstance,
  messageService: MessageService,
): void {
  app.get("/messages", async () => {
    return { items: messageService.listAll() };
  });

  app.get<{ Params: { id: string } }>("/rooms/:id/messages", async (request) => {
    return { items: messageService.listRoomMessages(request.params.id) };
  });

  app.get<{ Params: { id: string } }>("/agents/:id/inbox", async (request) => {
    return { items: messageService.listDirectMessages(request.params.id) };
  });

  app.get<{ Params: { id: string } }>("/tasks/:id/messages", async (request) => {
    return { items: messageService.listTaskMessages(request.params.id) };
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
