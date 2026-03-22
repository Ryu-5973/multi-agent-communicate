import type { OpenClawRuntimeBridge, RuntimeMountOptions } from "./runtime-bridge.js";
import { OpenClawAdapterPlugin } from "./plugin.js";

export type OpenClawAdapterHostOptions = RuntimeMountOptions & {
  rooms?: string[];
};

export class OpenClawAdapterHost {
  private readonly watchedRooms = new Set<string>();
  private readonly mountOptions: RuntimeMountOptions;
  private runtime: OpenClawRuntimeBridge | null = null;

  constructor(
    private readonly plugin: OpenClawAdapterPlugin,
    options: OpenClawAdapterHostOptions = {},
  ) {
    this.mountOptions = {
      syncInboxOnMount: options.syncInboxOnMount,
      replaySyncedEvents: options.replaySyncedEvents,
    };

    for (const roomId of options.rooms ?? []) {
      this.watchedRooms.add(roomId);
    }
  }

  async start(runtime: OpenClawRuntimeBridge): Promise<void> {
    this.runtime = runtime;
    await this.plugin.mountRuntime(runtime, {
      ...this.mountOptions,
      subscribeRooms: [...this.watchedRooms],
    });
  }

  async stop(): Promise<void> {
    if (!this.runtime) {
      return;
    }

    await this.plugin.unmountRuntime();
    this.runtime = null;
  }

  async watchRoom(roomId: string): Promise<void> {
    this.watchedRooms.add(roomId);

    if (!this.runtime) {
      return;
    }

    await this.plugin.subscribeRoom(roomId);
  }

  async unwatchRoom(roomId: string): Promise<void> {
    this.watchedRooms.delete(roomId);

    if (!this.runtime) {
      return;
    }

    await this.plugin.unsubscribeRoom(roomId);
  }

  listWatchedRooms(): string[] {
    return [...this.watchedRooms];
  }

  async syncAllWatchedRooms(): Promise<void> {
    if (!this.runtime) {
      return;
    }

    for (const roomId of this.watchedRooms) {
      const events = await this.plugin.syncRoom(roomId);

      for (const event of events) {
        await this.runtime.deliverInboundEvent(event);
      }
    }
  }
}
