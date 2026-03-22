import { taskSchema } from "@multi-agent-communicate/protocol";
import type { FastifyInstance } from "fastify";

import { TaskService } from "../services/task-service.js";

export function registerTaskRoutes(app: FastifyInstance, taskService: TaskService): void {
  app.get("/tasks", async () => {
    return { items: taskService.list() };
  });

  app.get<{ Params: { id: string } }>("/tasks/:id", async (request, reply) => {
    const task = taskService.get(request.params.id);

    if (!task) {
      return reply.code(404).send({ message: "Task not found" });
    }

    return task;
  });

  app.post("/tasks", async (request, reply) => {
    const parsed = taskSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid task payload", issues: parsed.error.issues });
    }

    return reply.code(201).send(taskService.upsert(parsed.data));
  });
}
