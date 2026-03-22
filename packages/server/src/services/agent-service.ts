import type { Agent } from "@multi-agent-communicate/protocol";

export class AgentService {
  constructor(private readonly agents: Map<string, Agent>) {}

  register(agent: Agent): Agent {
    this.agents.set(agent.id, agent);
    return agent;
  }

  list(): Agent[] {
    return [...this.agents.values()];
  }

  get(id: string): Agent | null {
    return this.agents.get(id) ?? null;
  }
}
