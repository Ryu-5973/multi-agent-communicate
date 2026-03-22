import type { Message } from "@multi-agent-communicate/protocol";

type PublishListener = (message: Message) => void;

type MessageState = {
  messages: Map<string, Message>;
  roomMessages: Map<string, string[]>;
  directMessages: Map<string, string[]>;
  taskMessages: Map<string, string[]>;
};

export class MessageService {
  private readonly listeners = new Set<PublishListener>();

  constructor(private readonly state: MessageState) {}

  publish(message: Message): Message {
    this.state.messages.set(message.id, message);

    if (message.target.mode === "room") {
      const roomMessageIds = this.state.roomMessages.get(message.target.roomId) ?? [];
      roomMessageIds.push(message.id);
      this.state.roomMessages.set(message.target.roomId, roomMessageIds);
    } else {
      const directMessageIds = this.state.directMessages.get(message.target.to) ?? [];
      directMessageIds.push(message.id);
      this.state.directMessages.set(message.target.to, directMessageIds);
    }

    if (message.taskId) {
      const taskMessageIds = this.state.taskMessages.get(message.taskId) ?? [];
      taskMessageIds.push(message.id);
      this.state.taskMessages.set(message.taskId, taskMessageIds);
    }

    this.emit(message);
    return message;
  }

  listAll(): Message[] {
    return [...this.state.messages.values()];
  }

  listDirectMessages(agentId: string, limit?: number): Message[] {
    const ids = this.state.directMessages.get(agentId) ?? [];
    return this.resolveByIds(ids, limit);
  }

  listTaskMessages(taskId: string, limit?: number): Message[] {
    const ids = this.state.taskMessages.get(taskId) ?? [];
    return this.resolveByIds(ids, limit);
  }

  listRoomMessages(roomId: string, limit?: number): Message[] {
    const ids = this.state.roomMessages.get(roomId) ?? [];
    return this.resolveByIds(ids, limit);
  }

  onPublish(listener: PublishListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(message: Message): void {
    for (const listener of this.listeners) {
      listener(message);
    }
  }

  private resolveByIds(ids: string[], limit?: number): Message[] {
    const selectedIds =
      typeof limit === "number" && limit > 0 ? ids.slice(-limit) : ids;

    return selectedIds
      .map((id) => this.state.messages.get(id))
      .filter((message): message is Message => Boolean(message));
  }
}
