import { setTimeout as delay } from "node:timers/promises";

import { OpenClawAdapterPlugin } from "../../packages/openclaw-adapter/dist/index.js";
import { buildServer } from "../../packages/server/dist/app.js";

const host = "127.0.0.1";
const port = 3100;
const httpBaseUrl = `http://${host}:${port}`;
const websocketUrl = `ws://${host}:${port}/ws`;

const plannerBot = {
  botId: "planner-bot",
  name: "planner-bot",
  capabilities: ["planner"],
  metadata: {
    role: "planner",
  },
};

const coderBot = {
  botId: "coder-bot",
  name: "coder-bot",
  capabilities: ["code"],
  metadata: {
    role: "coder",
  },
};

const room = {
  id: "room-alpha",
  name: "alpha-room",
  purpose: "OpenClaw adapter roundtrip demo",
  participants: [],
  createdAt: new Date().toISOString(),
  metadata: {
    source: "examples/e2e/openclaw-roundtrip.mjs",
  },
};

const task = {
  id: "task-001",
  title: "Implement routing flow",
  detail: "Build room broadcast and direct delivery",
  assignedTo: "openclaw.coder-bot",
  status: "queued",
  priority: "high",
  metadata: {
    roomId: room.id,
  },
};

const plannerAdapter = new OpenClawAdapterPlugin(
  { baseUrl: httpBaseUrl },
  { url: websocketUrl },
);

const coderAdapter = new OpenClawAdapterPlugin(
  { baseUrl: httpBaseUrl },
  { url: websocketUrl },
);

const server = await buildServer();

try {
  await server.listen({ host, port });

  const plannerEvents = [];
  const coderEvents = [];

  await plannerAdapter.registerBot(plannerBot);
  await coderAdapter.registerBot(coderBot);

  await plannerAdapter.ensureRoom(room);
  await plannerAdapter.joinRoom(room.id, plannerBot.botId);
  await coderAdapter.joinRoom(room.id, coderBot.botId);
  await plannerAdapter.connectRealtime();
  await coderAdapter.connectRealtime();

  const stopPlannerRealtime = plannerAdapter.onRealtimeEvent((event) => {
    plannerEvents.push(event);
    console.log("planner inbound event");
    console.log(JSON.stringify(event, null, 2));
  });

  const stopCoderRealtime = coderAdapter.onRealtimeEvent((event) => {
    coderEvents.push(event);
    console.log("coder inbound event");
    console.log(JSON.stringify(event, null, 2));
  });

  await plannerAdapter.subscribeInbox(plannerBot.botId);
  await plannerAdapter.subscribeRoom(room.id);
  await coderAdapter.subscribeInbox(coderBot.botId);
  await coderAdapter.subscribeRoom(room.id);

  await delay(100);

  await plannerAdapter.handleOutbound({
    type: "task.assign",
    messageId: "msg-001",
    fromBotId: plannerBot.botId,
    target: {
      mode: "room",
      roomId: room.id,
    },
    text: "Please implement the routing flow.",
    timestamp: new Date().toISOString(),
    task: {
      id: task.id,
      title: task.title,
      detail: task.detail,
      assignedTo: task.assignedTo,
      priority: task.priority,
    },
  });

  await delay(100);

  await coderAdapter.handleOutbound({
    type: "task.update",
    messageId: "msg-002",
    fromBotId: coderBot.botId,
    target: {
      mode: "direct",
      agentId: "openclaw.planner-bot",
    },
    text: "Routing work is in progress.",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    correlationId: "msg-001",
    update: {
      status: "running",
      progress: "Message model is complete and route handling has started",
    },
  });

  await delay(200);

  const taskResponse = await fetch(`${httpBaseUrl}/tasks/${task.id}`);
  const storedTask = await taskResponse.json();
  const taskMessagesResponse = await fetch(`${httpBaseUrl}/tasks/${task.id}/messages`);
  const taskMessages = await taskMessagesResponse.json();

  console.log("demo summary");
  console.log(
    JSON.stringify(
      {
        plannerEventCount: plannerEvents.length,
        coderEventCount: coderEvents.length,
        storedTask,
        taskMessageCount: taskMessages.items.length,
      },
      null,
      2,
    ),
  );

  stopPlannerRealtime();
  stopCoderRealtime();
  plannerAdapter.disconnectRealtime();
  coderAdapter.disconnectRealtime();
} finally {
  await server.close();
}
