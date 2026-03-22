import type { Agent } from "@multi-agent-communicate/protocol";

import type { OpenClawBotDescriptor } from "./types.js";

export class OpenClawIdentityMapper {
  private readonly botToAgent = new Map<string, string>();
  private readonly agentToBot = new Map<string, string>();

  toAgentId(botId: string): string {
    return this.botToAgent.get(botId) ?? `openclaw.${botId}`;
  }

  toBotId(agentId: string): string | null {
    return this.agentToBot.get(agentId) ?? null;
  }

  toAgent(bot: OpenClawBotDescriptor): Agent {
    const agentId = this.toAgentId(bot.botId);
    this.botToAgent.set(bot.botId, agentId);
    this.agentToBot.set(agentId, bot.botId);

    return {
      id: agentId,
      runtime: "openclaw",
      name: bot.name,
      capabilities: bot.capabilities ?? [],
      status: "online",
      metadata: {
        botId: bot.botId,
        ...(bot.metadata ?? {}),
      },
    };
  }
}
