# multi-agent-communicate

A communication bus for multi-agent collaboration across runtimes such as OpenClaw, Codex CLI, Claude Code CLI, and Gemini CLI.

## Current focus

OpenClaw-first design for:
- room-based agent conversations
- direct messaging between agents
- task assignment and progress reporting
- a protocol that can later be exposed as a skill

## Workspace

Current implementation starts with `packages/protocol`, which defines the shared TypeScript types and Zod schemas for:
- agents
- rooms
- tasks
- messages
- protocol envelopes

Current protocol package also includes:
- discriminated message schemas for chat, ask, answer, system, and task events
- discriminated protocol event envelopes
- helper factories for creating messages and envelopes consistently

Current server package includes:
- Fastify app bootstrap
- in-memory agent, room, task, and message services
- REST routes for `/agents`, `/rooms`, `/tasks`, `/messages`
- room message history and direct inbox endpoints
- task message history endpoint at `/tasks/:id/messages`
- WebSocket gateway at `/ws` for room and inbox subscriptions

Current OpenClaw adapter package includes:
- a bus REST client
- an optional websocket subscription client
- bot-to-agent identity mapping
- inbound and outbound protocol translators
- a plugin shell that can be wired to real OpenClaw runtime hooks
- history sync helpers for inbox, room, and task catch-up
- a host wrapper for plugin-style runtime lifecycle management

## Run

Install dependencies:

```bash
npm install
```

Build the workspace:

```bash
npm run build --workspaces
```

Start the server:

```bash
node packages/server/dist/app.js
```

Default address:

```text
http://localhost:3000
ws://localhost:3000/ws
```

Run the end-to-end demo:

```bash
npm run demo:e2e
```

Run the mock runtime bridge demo:

```bash
npm run demo:runtime
```

## Docs

- [Architecture proposal](./docs/architecture.md)
- [MVP roadmap](./docs/roadmap.md)
- [API usage](./docs/api.md)
- [OpenClaw adapter](./docs/openclaw-adapter.md)
