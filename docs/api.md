# API Usage

## Start the server

Install dependencies:

```bash
npm install
```

Build the workspace:

```bash
npm run build --workspaces
```

Run the server:

```bash
node packages/server/dist/app.js
```

By default the server listens on:

```text
http://localhost:3000
ws://localhost:3000/ws
```

There is also a built end-to-end demo:

```bash
npm run demo:e2e
```

## Health check

```bash
curl http://localhost:3000/health
```

## Register agents

```bash
curl -X POST http://localhost:3000/agents \
  -H 'Content-Type: application/json' \
  -d @examples/http/register-planner.json
```

```bash
curl -X POST http://localhost:3000/agents \
  -H 'Content-Type: application/json' \
  -d @examples/http/register-coder.json
```

List agents:

```bash
curl http://localhost:3000/agents
```

## Create a room

```bash
curl -X POST http://localhost:3000/rooms \
  -H 'Content-Type: application/json' \
  -d @examples/http/create-room.json
```

Join room:

```bash
curl -X POST http://localhost:3000/rooms/room-alpha/join \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"planner.openclaw"}'
```

```bash
curl -X POST http://localhost:3000/rooms/room-alpha/join \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"coder.codex"}'
```

List rooms:

```bash
curl http://localhost:3000/rooms
```

## Create a task

You can create a task explicitly:

```bash
curl -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -d @examples/http/create-task.json
```

List tasks:

```bash
curl http://localhost:3000/tasks
```

Task state can also be created and updated implicitly by publishing:
- `task.assign`
- `task.update`
- `task.done`

## Publish a room message

```bash
curl -X POST http://localhost:3000/messages \
  -H 'Content-Type: application/json' \
  -d @examples/http/message-room-task-assign.json
```

Room history:

```bash
curl http://localhost:3000/rooms/room-alpha/messages
```

## Publish a direct message

```bash
curl -X POST http://localhost:3000/messages \
  -H 'Content-Type: application/json' \
  -d @examples/http/message-direct-task-update.json
```

Direct inbox:

```bash
curl http://localhost:3000/agents/planner.openclaw/inbox
```

Task message history:

```bash
curl http://localhost:3000/tasks/task-001/messages
```

## WebSocket subscriptions

The websocket endpoint is:

```text
ws://localhost:3000/ws
```

You can test it with `wscat`:

```bash
npx wscat -c ws://localhost:3000/ws
```

Subscribe to a room:

```json
{"action":"subscribe.room","roomId":"room-alpha"}
```

Subscribe to an inbox:

```json
{"action":"subscribe.inbox","agentId":"planner.openclaw"}
```

Ping:

```json
{"action":"ping"}
```

Possible server events:

- `subscribed.room`
- `unsubscribed.room`
- `subscribed.inbox`
- `unsubscribed.inbox`
- `pong`
- `message.published`
- `error`

## Current limits

- storage is in-memory only
- restarting the server clears all state
- websocket subscriptions are transient
- there is no authentication yet
