# OpenClaw Adapter

## Goal

Provide a narrow integration layer between OpenClaw bots and the bus server without moving routing or state ownership into the adapter.

The adapter is responsible for:
- turning OpenClaw bot descriptors into bus agents
- translating OpenClaw-originated actions into protocol messages
- translating bus messages into OpenClaw-native inbound events
- calling the bus server through the current REST API

The adapter is not responsible for:
- global routing logic
- persistence
- task orchestration policy
- room ownership rules

## Package layout

The adapter lives in:

```text
packages/openclaw-adapter/
```

Core files:
- `src/types.ts`
- `src/mapper.ts`
- `src/bus-client.ts`
- `src/ws-client.ts`
- `src/outbound-handler.ts`
- `src/inbound-handler.ts`
- `src/plugin.ts`

## Current integration model

The current server exposes REST operations for:
- agent registration
- room creation and membership
- task creation
- message publishing
- room history
- direct inbox history

The current adapter uses those REST endpoints as its write transport and includes an optional websocket client for push delivery.

## OpenClaw-side model

The adapter assumes OpenClaw can provide:
- a bot id
- a bot display name
- optional capability labels
- outbound actions such as chat, ask, answer, task update, or task completion

The adapter converts each bot into a bus `Agent` with runtime `openclaw`.

## Outbound flow

1. OpenClaw emits an outbound collaboration action.
2. The adapter maps the bot id to a bus agent id.
3. The outbound handler converts the action into a protocol `Message`.
4. The bus client sends that message to `POST /messages`.

## Inbound flow

1. The adapter receives a bus `Message`.
2. The inbound handler converts it into an OpenClaw-native event object.
3. The OpenClaw integration layer decides how to feed that event into the target bot.

## Realtime support

When configured with a websocket endpoint, the plugin can:
- connect to `/ws`
- subscribe to room traffic
- subscribe to a bot inbox
- surface `message.published` events as OpenClaw inbound events

This is the intended live delivery path for bus messages.

## Demo

There is a minimal roundtrip demo at:

```text
examples/e2e/openclaw-roundtrip.mjs
```

Run it with:

```bash
npm run demo:e2e
```

## Recommended next step

Once OpenClaw runtime hook points are identified, wire them into:
- `OpenClawAdapterPlugin.registerBot`
- `OpenClawAdapterPlugin.handleOutbound`
- `OpenClawAdapterPlugin.handleInbound`
- `OpenClawAdapterPlugin.connectRealtime`
- `OpenClawAdapterPlugin.subscribeRoom`
- `OpenClawAdapterPlugin.subscribeInbox`

That should be enough to prove the first OpenClaw-to-bus round trip.
