import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import { runBenchmark, seedBenchmarkData, warmHealth } from "./lib.mjs";

const host = "127.0.0.1";
const port = 3300;
const baseUrl = `http://${host}:${port}`;

const server = spawn("node", ["packages/server/dist/app.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST: host,
    PORT: String(port),
  },
  stdio: "ignore",
});

try {
  await delay(500);
  await seedBenchmarkData(baseUrl, 200);
  await warmHealth(baseUrl, 50);

  const health = await runBenchmark({
    name: "health",
    total: 1000,
    concurrency: 20,
    requestFactory: () => fetch(`${baseUrl}/health`),
  });

  const messagePublish = await runBenchmark({
    name: "message_publish",
    total: 1000,
    concurrency: 20,
    requestFactory: (index) =>
      fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: `perf-msg-${index}`,
          from: "bench.planner",
          target: { mode: "room", roomId: "bench-room" },
          type: "task.assign",
          timestamp: new Date().toISOString(),
          content: {
            kind: "task.assign",
            text: `perf task ${index}`,
            data: {},
            task: {
              id: `perf-task-${index}`,
              title: `Perf Task ${index}`,
              detail: "perf payload",
              assignedTo: "bench.coder",
              priority: "medium",
            },
          },
          correlationId: null,
          taskId: `perf-task-${index}`,
          metadata: {},
        }),
      }),
  });

  const taskMessages = await runBenchmark({
    name: "task_messages",
    total: 1000,
    concurrency: 20,
    requestFactory: (index) =>
      fetch(`${baseUrl}/tasks/bench-task-${index % 200}/messages?limit=50`),
  });

  console.log(JSON.stringify({ health, messagePublish, taskMessages }, null, 2));
} finally {
  server.kill("SIGTERM");
}
