export async function seedBenchmarkData(baseUrl, count = 200) {
  const planner = {
    id: "bench.planner",
    runtime: "openclaw",
    name: "bench-planner",
    capabilities: ["planner"],
    status: "online",
    metadata: {},
  };

  const coder = {
    id: "bench.coder",
    runtime: "codex-cli",
    name: "bench-coder",
    capabilities: ["code"],
    status: "online",
    metadata: {},
  };

  const room = {
    id: "bench-room",
    name: "bench-room",
    purpose: "benchmark",
    participants: [],
    createdAt: new Date().toISOString(),
    metadata: {},
  };

  await fetchJson(`${baseUrl}/agents`, {
    method: "POST",
    body: planner,
  });
  await fetchJson(`${baseUrl}/agents`, {
    method: "POST",
    body: coder,
  });
  await fetchJson(`${baseUrl}/rooms`, {
    method: "POST",
    body: room,
  });
  await fetchJson(`${baseUrl}/rooms/bench-room/join`, {
    method: "POST",
    body: { agentId: "bench.planner" },
  });
  await fetchJson(`${baseUrl}/rooms/bench-room/join`, {
    method: "POST",
    body: { agentId: "bench.coder" },
  });

  for (let index = 0; index < count; index += 1) {
    await fetchJson(`${baseUrl}/messages`, {
      method: "POST",
      body: {
        id: `bench-msg-${index}`,
        from: "bench.planner",
        target: { mode: "room", roomId: "bench-room" },
        type: "task.assign",
        timestamp: new Date().toISOString(),
        content: {
          kind: "task.assign",
          text: `bench task ${index}`,
          data: {},
          task: {
            id: `bench-task-${index}`,
            title: `Bench Task ${index}`,
            detail: "benchmark payload",
            assignedTo: "bench.coder",
            priority: "medium",
          },
        },
        correlationId: null,
        taskId: `bench-task-${index}`,
        metadata: {},
      },
    });
  }
}

export async function warmHealth(baseUrl, count = 50) {
  for (let index = 0; index < count; index += 1) {
    await fetch(`${baseUrl}/health`);
  }
}

export async function runBenchmark({ name, total, concurrency, requestFactory }) {
  let next = 0;
  const times = [];

  async function worker() {
    while (true) {
      const current = next;
      next += 1;

      if (current >= total) {
        return;
      }

      const start = process.hrtime.bigint();
      const response = await requestFactory(current);

      if (!response.ok) {
        throw new Error(`${name} failed with status ${response.status}`);
      }

      await response.text();
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      times.push(durationMs);
    }
  }

  const startedAt = process.hrtime.bigint();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const totalMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

  times.sort((left, right) => left - right);

  function percentile(value) {
    return times[Math.min(times.length - 1, Math.floor(times.length * value))];
  }

  return {
    name,
    total,
    concurrency,
    rps: Number((total / (totalMs / 1000)).toFixed(2)),
    avgMs: Number((times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(3)),
    p50Ms: Number(percentile(0.5).toFixed(3)),
    p95Ms: Number(percentile(0.95).toFixed(3)),
    p99Ms: Number(percentile(0.99).toFixed(3)),
    maxMs: Number(times[times.length - 1].toFixed(3)),
  };
}

async function fetchJson(url, { method, body }) {
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }

  return response;
}
