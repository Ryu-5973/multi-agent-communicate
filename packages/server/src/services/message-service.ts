import type { Message } from "@multi-agent-communicate/protocol";

type PublishListener = (message: Message) => void;

type MessageState = {
  messages: Map<string, Message>;
  roomMessages: Map<string, string[]>;
  directMessages: Map<string, string[]>;
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

    this.emit(message);
    return message;
  }

  listAll(): Message[] {
    return [...this.state.messages.values()];
  }

  listRoomMessages(roomId: string): Message[] {
    const ids = this.state.roomMessages.get(roomId) ?? [];
    return ids
      .map((id) => this.state.messages.get(id))
      .filter((message): message is Message => Boolean(message));
  }

  listDirectMessages(agentId: string): Message[] {
    const ids = this.state.directMessages.get(agentId) ?? [];
    return ids
      .map((id) => this.state.messages.get(id))
      .filter((message): message is Message => Boolean(message));
  }

  listTaskMessages(taskId: string): Message[] {
    return [...this.state.messages.values()].filter((message) => message.taskId === taskId);
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
}
