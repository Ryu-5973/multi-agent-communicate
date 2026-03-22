# MVP Roadmap

## Goal

Build the smallest useful version of the multi-agent communication system with OpenClaw as the first supported runtime.

The MVP should prove that:
- multiple agents can register onto one shared bus
- agents can talk in rooms and through direct messages
- one agent can assign work to another
- the assignee can report progress and completion

## Phase 0: protocol foundation

Deliverables:
- shared agent, room, message, and task types
- message type definitions
- schema validation rules
- id and timestamp conventions

Minimum decisions:
- required fields for every message
- direct message versus room message shape
- `task_id` and `correlation_id` rules
- runtime naming conventions such as `openclaw`, `codex-cli`, `claude-code`, `gemini-cli`

Exit criteria:
- the protocol is stable enough that server and adapter work can proceed without inventing fields ad hoc

## Phase 1: bus server MVP

Deliverables:
- HTTP API for agent registration and room management
- message publish endpoints
- WebSocket subscription channel
- in-process routing
- SQLite persistence

Must-have capabilities:
- register agent
- create room
- join room
- send room message
- send direct message
- query recent room messages

Exit criteria:
- two test clients can exchange room and direct messages through the server

## Phase 2: task event model

Deliverables:
- task assignment event
- task progress update event
- task completion event
- task state query

Must-have capabilities:
- assign a task to a specific agent
- update task status
- retrieve task history by `task_id`

Exit criteria:
- one client can assign work and another can report progress with traceable state transitions

## Phase 3: OpenClaw adapter

Deliverables:
- OpenClaw plugin or adapter shell
- bus client integration
- agent registration on startup
- inbound and outbound message translation
- task update translation

Must-have capabilities:
- represent each OpenClaw bot as a bus agent
- subscribe to room or direct messages
- inject bus messages into OpenClaw bot handling
- publish OpenClaw-originated actions to the bus

Exit criteria:
- two OpenClaw bots can exchange structured messages through the bus

## Phase 4: end-to-end demo

Deliverables:
- one room-based collaboration demo
- one direct task assignment demo
- basic setup instructions

Preferred demo flow:
1. planner agent joins a room
2. coder agent joins the same room
3. planner assigns a task
4. coder reports progress
5. coder marks task done

Exit criteria:
- the repository contains a repeatable demo showing the full collaboration loop

## Phase 5: SDK and skill surface

Deliverables:
- reusable SDK client
- stable high-level collaboration methods
- initial skill-oriented wrapper

Suggested methods:
- `join_room`
- `send_message`
- `assign_task`
- `report_progress`
- `mark_task_done`
- `wait_for_reply`

Exit criteria:
- adapters and future skills can share the same client and operation vocabulary

## Deferred work

Do not include these in the MVP unless they become necessary:
- multi-tenant isolation
- advanced authorization
- distributed queue infrastructure
- durable retry orchestration
- long-term memory or retrieval
- rich UI
- automatic task planning logic

## Suggested implementation order

1. `packages/protocol`
2. `packages/server`
3. `packages/openclaw-adapter`
4. `packages/sdk`
5. demos
6. skill wrapper

## Early technical choices

Recommended first stack:
- `Node.js + TypeScript`
- `Fastify`
- `WebSocket`
- `SQLite`

Reasoning:
- fast to implement
- enough for MVP validation
- easy to evolve into PostgreSQL or Redis-backed infrastructure later

## Risks to watch

- making the protocol too OpenClaw-specific
- putting routing and persistence logic into the plugin
- skipping `correlation_id` and losing traceability
- overbuilding queue infrastructure before validating collaboration flows

## Success criteria

The MVP is successful if:
- OpenClaw bots can collaborate through a shared external bus
- messages and task states are traceable
- the protocol is reusable for later Codex CLI, Claude Code CLI, and Gemini CLI adapters
- the system is ready to be wrapped by a higher-level skill interface
