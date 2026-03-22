import { setTimeout as delay } from "node:timers/promises";

import {
  OpenClawAdapterHost,
  OpenClawAdapterPlugin,
} from "../../packages/openclaw-adapter/dist/index.js";
import { buildServer } from "../../packages/server/dist/app.js";

class MockOpenClawRuntime {
  #bots;
  #listeners = new Set();

  constructor(bots) {
    this.#bots = bots;
  }

  listBots() {
    return this.#bots;
  }

  onOutboundAction(listener) {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  }

  async emit(action) {
    for (const listener of this.#listeners) {
      await listener(action);
    }
  }

  async deliverInboundEvent(event) {
    console.log("runtime received inbound event");
    console.log(JSON.stringify(event, null, 2));
  }

  onMounted() {
    console.log("runtime mounted");
  }

  onUnmounted() {
    console.log("runtime unmounted");
  }
}

const host = "127.0.0.1";
const port = 3200;
const httpBaseUrl = `http://${host}:${port}`;
const websocketUrl = `ws://${host}:${port}/ws`;

const runtime = new MockOpenClawRuntime([
  {
    botId: "planner-bot",
    name: "planner-bot",
    capabilities: ["planner"],
  },
  {
    botId: "worker-bot",
    name: "worker-bot",
    capabilities: ["code"],
  },
]);

const adapter = new OpenClawAdapterPlugin(
  { baseUrl: httpBaseUrl },
  { url: websocketUrl },
);
const hostBridge = new OpenClawAdapterHost(adapter, {
  rooms: ["runtime-room"],
  syncInboxOnMount: true,
  replaySyncedEvents: true,
});

const server = await buildServer();

try {
  await server.listen({ host, port });
  await hostBridge.start(runtime);

  await fetch(`${httpBaseUrl}/rooms`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: "runtime-room",
      name: "runtime-room",
      purpose: "Mock runtime bridge demo",
      participants: [],
      createdAt: new Date().toISOString(),
      metadata: {},
    }),
  });

  await fetch(`${httpBaseUrl}/rooms/runtime-room/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agentId: "openclaw.planner-bot",
    }),
  });

  await fetch(`${httpBaseUrl}/rooms/runtime-room/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agentId: "openclaw.worker-bot",
    }),
  });

  await delay(100);

  await runtime.emit({
    type: "task.assign",
    messageId: "runtime-msg-001",
    fromBotId: "planner-bot",
    target: {
      mode: "room",
      roomId: "runtime-room",
    },
    text: "Implement the mock runtime flow.",
    timestamp: new Date().toISOString(),
    task: {
      id: "runtime-task-001",
      title: "Mock runtime task",
      detail: "Exercise the runtime bridge path",
      assignedTo: "openclaw.worker-bot",
      priority: "high",
    },
  });

  await delay(200);

  const syncedRoomEvents = await adapter.syncRoom("runtime-room");
  const syncedTaskEvents = await adapter.syncTaskMessages("runtime-task-001");

  console.log("runtime sync summary");
  console.log(
    JSON.stringify(
      {
        syncedRoomEventCount: syncedRoomEvents.length,
        syncedTaskEventCount: syncedTaskEvents.length,
      },
      null,
      2,
    ),
  );
} finally {
  await hostBridge.stop();
  await server.close();
}
