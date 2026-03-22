import cors from "@fastify/cors";
import Fastify from "fastify";
import { pathToFileURL } from "node:url";

import { registerAgentRoutes } from "./routes/agents.js";
import { registerMessageRoutes } from "./routes/messages.js";
import { registerRoomRoutes } from "./routes/rooms.js";
import { registerTaskRoutes } from "./routes/tasks.js";
import { AgentService } from "./services/agent-service.js";
import { MessageService } from "./services/message-service.js";
import { RoomService } from "./services/room-service.js";
import { TaskService } from "./services/task-service.js";
import { createMemoryState } from "./storage/memory-store.js";
import type { ServerConfig } from "./types.js";
import { WebSocketGateway } from "./ws/gateway.js";

export async function buildServer() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  const state = createMemoryState();
  const agentService = new AgentService(state.agents);
  const roomService = new RoomService(state.rooms);
  const taskService = new TaskService(state.tasks);
  const messageService = new MessageService({
    messages: state.messages,
    roomMessages: state.roomMessages,
    directMessages: state.directMessages,
  });
  const webSocketGateway = new WebSocketGateway();

  app.get("/health", async () => {
    return { ok: true };
  });

  await webSocketGateway.register(app);
  messageService.onPublish((message) => {
    taskService.applyMessage(message);
    webSocketGateway.publish(message);
  });

  registerAgentRoutes(app, agentService);
  registerRoomRoutes(app, roomService);
  registerTaskRoutes(app, taskService);
  registerMessageRoutes(app, messageService);

  return app;
}

async function start() {
  const config: ServerConfig = {
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 3000),
  };

  const app = await buildServer();
  await app.listen({
    host: config.host,
    port: config.port,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
