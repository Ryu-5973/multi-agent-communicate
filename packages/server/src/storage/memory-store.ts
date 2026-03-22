import type { InMemoryState } from "../types.js";

export function createMemoryState(): InMemoryState {
  return {
    agents: new Map(),
    rooms: new Map(),
    messages: new Map(),
    roomMessages: new Map(),
    directMessages: new Map(),
    tasks: new Map(),
  };
}
