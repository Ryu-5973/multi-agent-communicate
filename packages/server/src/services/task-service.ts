import type { Message, Task } from "@multi-agent-communicate/protocol";

export class TaskService {
  constructor(private readonly tasks: Map<string, Task>) {}

  upsert(task: Task): Task {
    this.tasks.set(task.id, task);
    return task;
  }

  list(): Task[] {
    return [...this.tasks.values()];
  }

  get(id: string): Task | null {
    return this.tasks.get(id) ?? null;
  }

  applyMessage(message: Message): Task | null {
    switch (message.type) {
      case "task.assign": {
        const task: Task = {
          id: message.content.task.id,
          title: message.content.task.title,
          detail: message.content.task.detail,
          assignedTo: message.content.task.assignedTo,
          priority: message.content.task.priority,
          status: "queued",
          metadata: {
            sourceMessageId: message.id,
            ...(message.target.mode === "room" ? { roomId: message.target.roomId } : {}),
          },
        };

        this.tasks.set(task.id, task);
        return task;
      }
      case "task.update": {
        if (!message.taskId) {
          return null;
        }

        const existing = this.tasks.get(message.taskId);

        if (!existing) {
          return null;
        }

        const updated: Task = {
          ...existing,
          status: message.content.update.status,
          metadata: {
            ...existing.metadata,
            lastProgress: message.content.update.progress,
            lastProgressMessageId: message.id,
          },
        };

        this.tasks.set(updated.id, updated);
        return updated;
      }
      case "task.done": {
        if (!message.taskId) {
          return null;
        }

        const existing = this.tasks.get(message.taskId);

        if (!existing) {
          return null;
        }

        const updated: Task = {
          ...existing,
          status: "done",
          result: message.content.result.output ?? message.content.result.summary,
          metadata: {
            ...existing.metadata,
            completionSummary: message.content.result.summary,
            completionMessageId: message.id,
          },
        };

        this.tasks.set(updated.id, updated);
        return updated;
      }
      default:
        return null;
    }
  }
}
