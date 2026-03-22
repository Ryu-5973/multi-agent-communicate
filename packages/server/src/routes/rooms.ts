import { roomSchema } from "@multi-agent-communicate/protocol";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { RoomService } from "../services/room-service.js";

const joinRoomSchema = z.object({
  agentId: z.string().min(1),
});

export function registerRoomRoutes(app: FastifyInstance, roomService: RoomService): void {
  app.get("/rooms", async () => {
    return { items: roomService.list() };
  });

  app.get<{ Params: { id: string } }>("/rooms/:id", async (request, reply) => {
    const room = roomService.get(request.params.id);

    if (!room) {
      return reply.code(404).send({ message: "Room not found" });
    }

    return room;
  });

  app.post("/rooms", async (request, reply) => {
    const parsed = roomSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid room payload", issues: parsed.error.issues });
    }

    return reply.code(201).send(roomService.create(parsed.data));
  });

  app.post<{ Params: { id: string } }>("/rooms/:id/join", async (request, reply) => {
    const parsed = joinRoomSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid join payload", issues: parsed.error.issues });
    }

    const room = roomService.join(request.params.id, parsed.data.agentId);

    if (!room) {
      return reply.code(404).send({ message: "Room not found" });
    }

    return room;
  });
}
