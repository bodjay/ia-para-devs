import {
  IArchitectureAnalysisAgentClient,
  AgentAnalysisInput,
  AgentAnalysisOutput,
} from '../../application/ports/IArchitectureAnalysisAgentClient';

export class ArchitectureAnalysisAgentClient implements IArchitectureAnalysisAgentClient {
  constructor(private readonly agentBaseUrl: string) {}

  async analyze(input: AgentAnalysisInput): Promise<AgentAnalysisOutput> {
    const response = await fetch(this.agentBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze',
        payload: input,
      }),
    });

    if (!response.ok) {
      throw new Error(`Architecture analysis agent returned status ${response.status}`);
    }

    return response.json() as Promise<AgentAnalysisOutput>;
  }
}
