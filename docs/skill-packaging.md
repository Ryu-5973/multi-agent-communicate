# Skill Packaging Guide

## Goal

Package the bus capabilities as a skill layer after the transport, runtime adapter, and host lifecycle are already stable.

The skill should not replace the bus server or the adapter. It should sit above them and expose a cleaner collaboration API to agents.

## Recommended layering

Keep the layers separate:

```text
Agent prompt / tool call
  -> skill API
  -> SDK or adapter client
  -> bus server
```

For OpenClaw specifically:

```text
OpenClaw bot
  -> OpenClawRuntimeBridge
  -> OpenClawAdapterHost / Plugin
  -> bus server
  -> skill-facing helper methods
```

## What the skill should own

The skill should own:
- easy-to-call collaboration operations
- argument normalization
- hiding protocol details from prompt-level logic
- consistent naming across runtimes

The skill should not own:
- websocket connections
- server persistence
- global routing rules
- room membership storage
- runtime lifecycle hooks

## Suggested skill surface

Minimum skill operations:
- `join_room(room_id)`
- `leave_room(room_id)`
- `send_message(to, content)`
- `broadcast(room_id, content)`
- `assign_task(agent, task)`
- `report_progress(task_id, progress)`
- `mark_task_done(task_id, result)`
- `wait_for_reply(correlation_id)`
- `sync_inbox(limit)`
- `sync_room(room_id, limit)`
- `sync_task(task_id, limit)`

## Mapping to current code

These current building blocks should back the skill:

Low-level transport:
- `packages/openclaw-adapter/src/plugin.ts`
- `packages/openclaw-adapter/src/host.ts`
- `packages/openclaw-adapter/src/bus-client.ts`

Protocol model:
- `packages/protocol/src/index.ts`

Server endpoints:
- `docs/api.md`

The skill should call into the adapter or a future SDK package, not rebuild transport logic from scratch.

## Recommended implementation order

1. keep using the current adapter and host directly until the OpenClaw integration is stable
2. introduce a thin skill wrapper over stable adapter methods
3. expose the same skill vocabulary to future runtimes like Codex CLI and Claude Code

Do not start by making the skill the transport boundary. That will make realtime delivery and lifecycle management harder.

## OpenClaw-specific recommendation

For OpenClaw, the best split is:
- plugin/host handles runtime lifecycle
- skill handles collaboration verbs

Example:
- plugin receives a bus message
- plugin converts it to an OpenClaw inbound event
- bot logic chooses to call `assign_task(...)`
- the skill maps that into adapter operations

## Suggested skill contract

If another agent is implementing the skill, this is a good first contract:

```ts
type CollaborationSkill = {
  joinRoom(roomId: string): Promise<void>;
  leaveRoom(roomId: string): Promise<void>;
  sendMessage(target: { agentId?: string; roomId?: string }, text: string): Promise<void>;
  assignTask(input: {
    taskId: string;
    title: string;
    detail: string;
    assignedTo: string;
    roomId?: string;
    priority?: "low" | "medium" | "high";
  }): Promise<void>;
  reportProgress(input: {
    taskId: string;
    progress: string;
    status: "queued" | "running" | "blocked" | "done";
    replyTo?: string;
    toAgentId?: string;
  }): Promise<void>;
  markTaskDone(input: {
    taskId: string;
    summary: string;
    output?: string;
    replyTo?: string;
    toAgentId?: string;
  }): Promise<void>;
  syncInbox(limit?: number): Promise<unknown[]>;
  syncRoom(roomId: string, limit?: number): Promise<unknown[]>;
  syncTask(taskId: string, limit?: number): Promise<unknown[]>;
};
```

## Why the skill comes later

The skill depends on stable answers to:
- how bots are identified
- how rooms are tracked
- how inbound events are injected into the runtime
- how reconnection and history replay work

Those are adapter and host concerns first.

Once those are stable, the skill becomes straightforward and reusable.

## Recommended next step for skill work

Do this after real OpenClaw integration exists:

1. build a thin wrapper around `OpenClawAdapterHost` and `OpenClawAdapterPlugin`
2. expose only collaboration verbs
3. keep protocol fields hidden behind the wrapper
4. add one minimal demo where a bot uses skill calls instead of constructing raw outbound actions
