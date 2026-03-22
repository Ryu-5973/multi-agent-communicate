import type { Message } from "@multi-agent-communicate/protocol";

import { OpenClawIdentityMapper } from "./mapper.js";
import type { OpenClawInboundEvent } from "./types.js";

export class OpenClawInboundHandler {
  constructor(private readonly mapper: OpenClawIdentityMapper) {}

  toInboundEvent(message: Message): OpenClawInboundEvent {
    const toBotId =
      message.target.mode === "direct" ? this.mapper.toBotId(message.target.to) : null;

    return {
      kind: "bus.message",
      toBotId,
      message,
      target: message.target,
      prompt: this.toPrompt(message),
    };
  }

  private toPrompt(message: Message): string {
    switch (message.type) {
      case "chat":
        return `[chat] ${message.from}: ${message.content.text}`;
      case "ask":
        return `[ask] ${message.from}: ${message.content.text}`;
      case "answer":
        return `[answer] ${message.from}: ${message.content.text}`;
      case "system":
        return `[system] ${message.content.text}`;
      case "task.assign":
        return `[task.assign] ${message.from}: ${message.content.task.title} - ${message.content.text}`;
      case "task.update":
        return `[task.update] ${message.from}: ${message.content.update.progress}`;
      case "task.done":
        return `[task.done] ${message.from}: ${message.content.result.summary}`;
    }
  }
}
