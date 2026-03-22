import type { Agent, Message, Room, Task } from "@multi-agent-communicate/protocol";

export type ServerConfig = {
  host: string;
  port: number;
};

export type InMemoryState = {
  agents: Map<string, Agent>;
  rooms: Map<string, Room>;
  messages: Map<string, Message>;
  roomMessages: Map<string, string[]>;
  directMessages: Map<string, string[]>;
  tasks: Map<string, Task>;
};
