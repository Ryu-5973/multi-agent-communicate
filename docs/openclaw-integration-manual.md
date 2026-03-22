# OpenClaw Integration Manual

## Goal

Integrate the existing adapter stack into a real OpenClaw plugin or extension so OpenClaw bots can:
- register on startup
- send structured collaboration messages
- receive realtime inbound bus messages
- catch up inbox, room, and task history after startup or reconnect

This manual assumes the bus server from this repository is already running.

## Existing building blocks

Use these files from this repository:
- `packages/openclaw-adapter/src/plugin.ts`
- `packages/openclaw-adapter/src/host.ts`
- `packages/openclaw-adapter/src/runtime-bridge.ts`
- `packages/openclaw-adapter/src/types.ts`
- `packages/openclaw-adapter/src/outbound-handler.ts`
- `packages/openclaw-adapter/src/inbound-handler.ts`

Reference demos:
- `examples/e2e/openclaw-roundtrip.mjs`
- `examples/e2e/mock-openclaw-runtime.mjs`

## Recommended layout inside OpenClaw

Suggested plugin-side structure:

```text
plugins/openclaw-agent-bus/
  index.ts
  runtime-bridge.ts
  config.ts
  room-registry.ts
```

## Integration model

Use:
- `OpenClawAdapterPlugin` as the low-level bus integration layer
- `OpenClawAdapterHost` as the lifecycle wrapper
- `OpenClawRuntimeBridge` as the boundary between OpenClaw and the adapter

That split keeps the OpenClaw-specific work local to the bridge implementation.

## Step 1: create the adapter host

Create one adapter instance:

```ts
import {
  OpenClawAdapterHost,
  OpenClawAdapterPlugin,
} from "@multi-agent-communicate/openclaw-adapter";

const plugin = new OpenClawAdapterPlugin(
  { baseUrl: "http://127.0.0.1:3000" },
  { url: "ws://127.0.0.1:3000/ws" },
);

const host = new OpenClawAdapterHost(plugin, {
  rooms: ["room-alpha"],
  syncInboxOnMount: true,
  replaySyncedEvents: true,
});
```

## Step 2: implement `OpenClawRuntimeBridge`

The bridge must implement:
- `listBots`
- `onOutboundAction`
- `deliverInboundEvent`

Optional lifecycle hooks:
- `onMounted`
- `onUnmounted`

### `listBots`

Return bot descriptors in this shape:

```ts
{
  botId: "planner-bot",
  name: "planner-bot",
  capabilities: ["planner"],
  metadata: { role: "planner" }
}
```

Notes:
- `botId` should be the native OpenClaw bot id
- do not prepend `openclaw.` yourself

### `onOutboundAction`

This is where OpenClaw outbound actions are translated into adapter actions.

Current supported action families:
- `chat`
- `ask`
- `answer`
- `task.assign`
- `task.update`
- `task.done`

Minimal room message example:

```ts
listener({
  type: "chat",
  messageId: "msg-001",
  fromBotId: "planner-bot",
  target: { mode: "room", roomId: "room-alpha" },
  text: "Start implementing message routing",
  timestamp: new Date().toISOString(),
});
```

Task assignment example:

```ts
listener({
  type: "task.assign",
  messageId: "msg-002",
  fromBotId: "planner-bot",
  target: { mode: "room", roomId: "room-alpha" },
  text: "Implement room broadcast support",
  timestamp: new Date().toISOString(),
  task: {
    id: "task-001",
    title: "Implement room broadcast support",
    detail: "Add room fan-out and direct delivery",
    assignedTo: "openclaw.worker-bot",
    priority: "high",
  },
});
```

Task progress example:

```ts
listener({
  type: "task.update",
  messageId: "msg-003",
  fromBotId: "worker-bot",
  target: { mode: "direct", agentId: "openclaw.planner-bot" },
  text: "Routing work is in progress",
  timestamp: new Date().toISOString(),
  taskId: "task-001",
  correlationId: "msg-002",
  update: {
    status: "running",
    progress: "Message model is complete",
  },
});
```

### `deliverInboundEvent`

This is where bus events are injected back into OpenClaw.

The adapter will pass:

```ts
{
  kind: "bus.message",
  toBotId: "planner-bot" | null,
  message,
  prompt,
  target
}
```

Delivery rules:
- if `toBotId` is set, deliver to that bot only
- if `toBotId` is `null`, treat it as room traffic and dispatch according to your room registry

Lowest-friction delivery shape:
- inject `prompt` as a system message
- attach raw `message` as metadata

## Step 3: manage rooms locally

Maintain a local room registry in the OpenClaw plugin:

```text
Map<roomId, Set<botId>>
```

The adapter host only manages bus subscriptions. It does not know which local bots belong to a room.

Recommended behavior:
- when a bot is configured into a room, register it locally
- call `host.watchRoom(roomId)`
- when a room is no longer needed, call `host.unwatchRoom(roomId)`

## Step 4: plugin lifecycle

Recommended startup flow:

1. Create the bridge
2. Create `OpenClawAdapterPlugin`
3. Create `OpenClawAdapterHost`
4. Register watched rooms
5. `await host.start(runtimeBridge)`

Recommended shutdown flow:

1. `await host.stop()`
2. release OpenClaw-side listeners

## Step 5: reconnect and catch-up

The current adapter gives you two receive paths:
- realtime websocket subscription
- explicit history sync

Use these methods after reconnect or startup:
- `plugin.syncInbox(botId)`
- `plugin.syncRoom(roomId)`
- `plugin.syncTaskMessages(taskId)`

If you want the host to replay inbox history during mount, set:

```ts
{
  syncInboxOnMount: true,
  replaySyncedEvents: true
}
```

## Step 6: minimal acceptance checklist

Validate these before calling the OpenClaw integration complete:

1. OpenClaw startup registers bots into `/agents`
2. direct messages reach the correct bot inbox
3. room messages reach all intended room participants
4. `task.assign` creates a task server-side
5. `task.update` advances task status
6. plugin restart can replay inbox or room history without losing state

## Current limits

- websocket reconnect is still host-managed, not automatic
- there is no authentication layer yet
- history reads support `limit` but not cursor pagination yet
- room membership policy still lives on the OpenClaw side

## Recommended implementation split for another agent

Task split:
- implement the concrete `OpenClawRuntimeBridge`
- map OpenClaw outbound events into `OpenClawOutboundAction`
- map `OpenClawInboundEvent` into OpenClaw bot input delivery
- add local room registry management
- connect plugin start and stop hooks to `host.start` and `host.stop`
- run a real end-to-end validation against the bus server
