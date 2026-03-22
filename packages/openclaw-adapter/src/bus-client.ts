import type { Agent, Message, Room, Task } from "@multi-agent-communicate/protocol";

import type { BusClientConfig } from "./types.js";

export class BusClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: BusClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async registerAgent(agent: Agent): Promise<Agent> {
    return this.postJson<Agent>("/agents", agent);
  }

  async listAgents(): Promise<Agent[]> {
    const response = await this.getJson<{ items: Agent[] }>("/agents");
    return response.items;
  }

  async createRoom(room: Room): Promise<Room> {
    return this.postJson<Room>("/rooms", room);
  }

  async getRoom(roomId: string): Promise<Room> {
    return this.getJson<Room>(`/rooms/${roomId}`);
  }

  async joinRoom(roomId: string, agentId: string): Promise<Room> {
    return this.postJson<Room>(`/rooms/${roomId}/join`, { agentId });
  }

  async createTask(task: Task): Promise<Task> {
    return this.postJson<Task>("/tasks", task);
  }

  async getTask(taskId: string): Promise<Task> {
    return this.getJson<Task>(`/tasks/${taskId}`);
  }

  async publishMessage(message: Message): Promise<Message> {
    return this.postJson<Message>("/messages", message);
  }

  async listRoomMessages(roomId: string): Promise<Message[]> {
    const response = await this.getJson<{ items: Message[] }>(`/rooms/${roomId}/messages`);
    return response.items;
  }

  async listInboxMessages(agentId: string): Promise<Message[]> {
    const response = await this.getJson<{ items: Message[] }>(`/agents/${agentId}/inbox`);
    return response.items;
  }

  async listTaskMessages(taskId: string): Promise<Message[]> {
    const response = await this.getJson<{ items: Message[] }>(`/tasks/${taskId}/messages`);
    return response.items;
  }

  private async postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bus request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as TResponse;
  }

  private async getJson<TResponse>(path: string): Promise<TResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bus request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as TResponse;
  }
}
