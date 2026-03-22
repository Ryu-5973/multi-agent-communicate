# Multi-Agent Communication Architecture

## Goal

Build a runtime-agnostic communication layer that allows agents to:
- talk to each other directly
- join shared rooms
- assign tasks
- report progress
- reply to earlier messages with traceable context

The first supported runtime should be OpenClaw. Later adapters can target Codex CLI, Claude Code CLI, Gemini CLI, and other agent environments.

## Problem

OpenClaw can run multiple bots, but they do not currently have a clean, shared mechanism for inter-agent communication. The missing capability is not just message passing. Agents also need collaboration primitives:
- room conversations
- point-to-point messages
- task lifecycle events
- status updates
- correlation between requests and replies

If this is implemented as OpenClaw-specific glue, future integration with other runtimes will be expensive. The communication layer should therefore be external and protocol-driven.

## Proposed approach

Use an `Agent Bus` as the core system.

External model:
- rooms for shared conversations
- direct messages for agent-to-agent communication
- structured events for task assignment and progress reporting

Internal model:
- an event bus with persistent message storage
- adapters that translate each runtime into the shared protocol

This is intentionally not "just a message queue" and not "just chat rooms".

It should behave like:
- chat for collaboration
- a task event stream for coordination
- a protocol boundary for multiple agent runtimes

## Why this shape

### Why not build it inside OpenClaw only

Because the target usage already includes multiple runtimes:
- OpenClaw
- Codex CLI
- Claude Code CLI
- Gemini CLI

If communication is embedded into OpenClaw-specific internals, later expansion will require rework at the protocol boundary. A standalone bus keeps OpenClaw as the first adapter, not the permanent center of the system.

### Why not start with a traditional MQ

A pure queue abstraction is too narrow for the expected workflow. The real interaction pattern is:
- one agent assigns a task
- another agent reports progress
- the first agent asks follow-up questions
- multiple agents share the same conversational context

That requires room context and request-reply linking, not just job consumption.

### Why not make it chat-only

Chat alone is insufficient because task state will matter immediately:
- queued
- running
- blocked
- done

Without structured task events, coordination will become ambiguous once multiple agents are active at the same time.

## Core concepts

### Agent

Represents a connected participant.

Suggested fields:
- `id`
- `runtime` such as `openclaw`, `codex-cli`, `claude-code`, `gemini-cli`
- `name`
- `capabilities` such as `planner`, `code`, `review`, `search`
- `status` such as `online`, `offline`, `busy`

### Room

Represents a shared collaboration space for a task, project area, or temporary working session.

Suggested fields:
- `id`
- `name`
- `purpose`
- `participants`
- `created_at`

### Message

Represents a single event on the bus.

Suggested fields:
- `id`
- `room_id` or direct `to`
- `from`
- `type`
- `content`
- `timestamp`
- `correlation_id`
- `task_id` when applicable

Suggested `type` values:
- `chat`
- `task.assign`
- `task.update`
- `task.done`
- `ask`
- `answer`
- `system`

### Task

Represents structured work tracked across messages.

Suggested fields:
- `task_id`
- `title`
- `detail`
- `assigned_to`
- `status`
- `priority`
- `result`

Suggested `status` values:
- `queued`
- `running`
- `blocked`
- `done`

## Required protocol features

The protocol should support:
- agent registration
- room creation
- room join and leave
- room broadcast
- direct messaging
- task assignment
- task progress updates
- task completion updates
- correlation of replies to earlier messages

Two identifiers are critical:
- `correlation_id` links a reply or update to an earlier message
- `task_id` links all events for the same unit of work

Without them, multi-agent sessions will become difficult to reason about.

## Protocol example

Task assignment:

```json
{
  "id": "msg_001",
  "room_id": "room_alpha",
  "type": "task.assign",
  "from": "planner.openclaw",
  "to": "coder.codex",
  "timestamp": "2026-03-22T03:00:00Z",
  "content": {
    "task_id": "task_123",
    "title": "Implement message routing",
    "detail": "Add room broadcast and direct message support",
    "priority": "high"
  },
  "correlation_id": null
}
```

Progress update:

```json
{
  "id": "msg_002",
  "room_id": "room_alpha",
  "type": "task.update",
  "from": "coder.codex",
  "to": "planner.openclaw",
  "timestamp": "2026-03-22T03:05:00Z",
  "content": {
    "task_id": "task_123",
    "status": "running",
    "progress": "Message model is complete, routing is in progress"
  },
  "correlation_id": "msg_001"
}
```

## Recommended architecture

Layered view:

```text
+--------------------------------------------------+
|                   Agent / Bot                    |
| OpenClaw bot | Codex CLI | Claude Code | Gemini |
+-------------------------+------------------------+
                          |
                          | high-level operations
                          v
+--------------------------------------------------+
|                     Skill Layer                  |
| join_room | send_message | assign_task |         |
| report_progress | wait_for_reply | list_agents   |
+-------------------------+------------------------+
                          |
                          | protocol client / sdk
                          v
+--------------------------------------------------+
|                 Adapter / Plugin Layer           |
| openclaw-plugin | codex-adapter | claude-adapter |
| gemini-adapter                                   |
|                                                  |
| responsibilities:                                |
| - runtime event hook                             |
| - identity mapping                               |
| - inbound/outbound translation                   |
| - connection/session management                  |
+-------------------------+------------------------+
                          |
                          | unified protocol
                          v
+--------------------------------------------------+
|                   Agent Bus Server               |
| rooms | direct messages | task events | presence |
| subscriptions | persistence | routing            |
+-------------------------+------------------------+
                          |
                          v
+--------------------------------------------------+
|                  Storage / Infra                 |
| SQLite first, later PostgreSQL / Redis / NATS    |
+--------------------------------------------------+
```

### 1. Bus server

A standalone service responsible for:
- agent presence
- room membership
- message persistence
- event delivery
- task state updates

Recommended interfaces:
- HTTP for command-style operations
- WebSocket for subscriptions and real-time delivery

### 2. Runtime adapters

Each runtime should integrate through an adapter.

Initial priority:
- `openclaw-adapter`

Future adapters:
- `codex-cli-adapter`
- `claude-code-cli-adapter`
- `gemini-cli-adapter`

Adapter responsibilities:
- register runtime agents onto the bus
- translate local runtime events into protocol messages
- convert bus messages back into runtime-native actions or prompts
- maintain runtime-specific connection state
- map runtime bot identities to bus agent identities

### 3. Shared protocol package

A shared package should define:
- message schemas
- task schemas
- validation
- serialization contracts

JSON is sufficient for the first version. If the project stabilizes, JSON Schema should be added for validation and documentation.

### 4. Skill layer

The skill layer should not own transport or routing. It should expose a small, stable set of high-level operations for agents to call.

Suggested skill responsibilities:
- wrap common bus operations behind simple function calls
- hide protocol details from agent prompts
- provide a runtime-neutral interface for collaboration

Suggested skill operations:
- `join_room(room_id)`
- `leave_room(room_id)`
- `send_message(to, content)`
- `broadcast(room_id, content)`
- `assign_task(agent, task)`
- `report_progress(task_id, progress)`
- `mark_task_done(task_id, result)`
- `wait_for_reply(correlation_id)`

The skill should depend on the SDK or protocol client, not reimplement transport logic.

## Plugin vs skill

They are complementary, not interchangeable.

### Plugin or adapter strengths

- closer to the runtime lifecycle
- suitable for event hooks, subscriptions, and passive message delivery
- can manage sessions, identity mapping, and connection state
- better for integrating many OpenClaw bots into one bus

### Plugin or adapter weaknesses

- deeper coupling to the runtime integration model
- higher implementation cost
- less reusable across runtimes without separate adapters

### Skill strengths

- simpler interface for agents to use
- easier to standardize across runtimes
- easier to reuse as a collaboration API
- good for common operations like task assignment and progress reporting

### Skill weaknesses

- weak fit for low-level connection management
- not sufficient by itself for subscriptions, presence, and passive inbound events
- depends on an underlying adapter or client to do real transport work

### Recommended split for this project

- the bus server owns rooms, routing, task events, and persistence
- the OpenClaw plugin owns runtime integration and message translation
- the skill owns the agent-facing API

That split keeps the OpenClaw integration narrow while preserving a reusable collaboration interface for later runtimes.

## Technology recommendation

For a first implementation:
- `Node.js + TypeScript`
- `Fastify` or `Express`
- `WebSocket`
- `SQLite` for the initial persistence layer

This is enough for an MVP. There is no need to start with RabbitMQ or Kafka unless the workload actually justifies it.

If the system later needs more durable event infrastructure or fan-out performance:
- `Redis Streams`
- `NATS`
- `PostgreSQL` instead of `SQLite`

## MVP scope

The first version should only implement:
- agent registration
- room creation and membership
- room broadcast
- direct messaging
- task assignment
- task progress and completion events

The first version should not implement:
- complex permissions
- multi-tenant isolation
- advanced scheduling
- distributed reliability guarantees
- long-term memory or retrieval features

## OpenClaw-first rollout

The safest first step is to add an external communication plugin or adapter for OpenClaw rather than modifying OpenClaw's internal coordination model deeply.

That adapter should support:
- registering each OpenClaw bot as an agent
- sending messages into rooms
- sending direct messages
- pulling or subscribing to pending events
- reporting task state changes

This keeps the integration narrow and makes later expansion easier.

## OpenClaw plugin principle

The OpenClaw plugin should act as an adapter between OpenClaw runtime events and the shared bus protocol.

It should not become the system of record for collaboration state. The bus server should remain the source of truth.

OpenClaw-side events:
- a bot comes online
- a bot wants to send a message
- a bot is assigned work
- a bot reports progress
- a bot completes work

Bus-side operations:
- register an agent
- join a room
- publish a message
- receive a direct message
- update task state

The plugin translates between those two sides.

Typical flow:

1. OpenClaw starts one or more bots.
2. The plugin assigns or resolves a bus `agent_id` for each bot.
3. The plugin registers those bots with the bus server.
4. When a bot emits a collaboration action, the plugin converts it into a protocol message and sends it to the bus.
5. When the bus has a message for that bot, the plugin receives it and converts it into an OpenClaw-native event or prompt input.
6. The bot responds, and the plugin sends follow-up events such as progress or completion back to the bus.

Plugin responsibilities should stay narrow:
- runtime event hook-in
- agent identity mapping
- protocol translation
- inbound and outbound transport

Plugin responsibilities should exclude:
- long-term message storage
- room routing rules
- global task orchestration policy
- system-wide state ownership

## Skill packaging direction

The future skill should sit above the bus, not replace it.

The bus is infrastructure. The skill is the agent-facing operation layer.

Example skill-facing operations:
- `join_room(room_id)`
- `send_message(to, content)`
- `assign_task(agent, task)`
- `report_progress(task_id, progress)`
- `wait_for_reply(correlation_id)`

This separation avoids coupling the transport layer to a single skill system.

## Suggested repository structure

```text
packages/
  protocol/
  server/
  openclaw-adapter/
  sdk/
examples/
docs/
```

Suggested responsibilities:
- `packages/protocol`: shared types and schemas
- `packages/server`: bus server implementation
- `packages/openclaw-adapter`: OpenClaw integration layer
- `packages/sdk`: reusable client helpers for skills and adapters
- `examples`: minimal end-to-end demos

Expanded structure:

```text
packages/
  protocol/
    src/
      agent.ts
      message.ts
      room.ts
      task.ts
      schema.ts
  sdk/
    src/
      client.ts
      skill-api.ts
      types.ts
  server/
    src/
      app.ts
      routes/
        agents.ts
        rooms.ts
        messages.ts
        tasks.ts
      services/
        presence-service.ts
        room-service.ts
        routing-service.ts
        task-service.ts
      storage/
        sqlite.ts
      ws/
        gateway.ts
  openclaw-adapter/
    src/
      plugin.ts
      mapper.ts
      bus-client.ts
      inbound-handler.ts
      outbound-handler.ts
  codex-cli-adapter/
    src/
  claude-code-adapter/
    src/
  gemini-cli-adapter/
    src/
examples/
  openclaw-room-demo/
  cross-runtime-demo/
docs/
```

## Implementation priorities

1. Define the protocol types and schema validation.
2. Build a minimal server with room messaging and direct messaging.
3. Add task lifecycle events on top of the message model.
4. Implement the OpenClaw adapter first.
5. Build a minimal SDK used by both adapters and future skills.
6. Add a demo showing two agents assigning and reporting work in one room.
7. Expose stable skill operations after the transport path is proven.

## Summary

The recommended direction is:
- external `Agent Bus`
- room-based collaboration
- direct messaging
- structured task events
- OpenClaw-first adapter
- protocol-first design for later Codex CLI, Claude Code CLI, Gemini CLI, and skill packaging
- clear separation between plugin responsibilities and skill responsibilities

This keeps the first implementation small while preserving the right expansion path.
