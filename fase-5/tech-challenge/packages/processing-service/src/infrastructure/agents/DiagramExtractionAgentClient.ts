export interface ExtractionAgentInput {
  diagram: {
    id: string;
    fileType: string;
    storageUrl: string;
  };
  options: {
    detectText: boolean;
    detectShapes: boolean;
    detectConnections: boolean;
    language: string;
  };
}

export interface ExtractedElement {
  id: string;
  label: string;
  type: 'microservice' | 'database' | 'broker' | 'client' | 'unknown';
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExtractedConnection {
  fromElementId: string;
  toElementId: string;
  type: 'sync' | 'async' | 'unknown';
  label: string;
}

export interface ExtractionAgentOutput {
  diagramId: string;
  status: 'processed' | 'failed';
  extractedText: string;
  elements: ExtractedElement[];
  connections: ExtractedConnection[];
  error?: {
    code: string;
    message: string;
  };
}

export class AgentTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentTimeoutError';
  }
}

export class AgentError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AgentError';
  }
}

export interface IDiagramExtractionAgentClient {
  extract(input: ExtractionAgentInput): Promise<ExtractionAgentOutput>;
}

export class DiagramExtractionAgentClient implements IDiagramExtractionAgentClient {
  constructor(private readonly baseUrl: string, private readonly timeoutMs: number = 30000) {}

  async extract(input: ExtractionAgentInput): Promise<ExtractionAgentOutput> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AgentError(`Agent returned status ${response.status}`);
      }

      return (await response.json()) as ExtractionAgentOutput;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new AgentTimeoutError(
          `Diagram extraction agent timed out after ${this.timeoutMs}ms`
        );
      }
      throw new AgentError(`Extraction failed: ${(error as Error).message}`, error as Error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
