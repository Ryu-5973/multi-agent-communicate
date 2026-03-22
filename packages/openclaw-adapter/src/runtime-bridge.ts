import type { OpenClawBotDescriptor, OpenClawInboundEvent, OpenClawOutboundAction } from "./types.js";

export type OutboundActionListener = (action: OpenClawOutboundAction) => void | Promise<void>;

export type RuntimeMountOptions = {
  subscribeRooms?: string[];
  syncInboxOnMount?: boolean;
  replaySyncedEvents?: boolean;
};

export interface OpenClawRuntimeBridge {
  listBots(): Promise<OpenClawBotDescriptor[]> | OpenClawBotDescriptor[];
  onOutboundAction(listener: OutboundActionListener): () => void;
  deliverInboundEvent(event: OpenClawInboundEvent): Promise<void> | void;
  onMounted?(): Promise<void> | void;
  onUnmounted?(): Promise<void> | void;
}
