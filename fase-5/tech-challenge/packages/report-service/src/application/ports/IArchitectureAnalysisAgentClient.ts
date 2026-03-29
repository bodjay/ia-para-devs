import {
  ComponentType,
  SeverityLevel,
  PriorityLevel,
  ArchitecturePattern,
} from '../../domain/entities/Report';
import { AnalysisDepth, ConnectionType } from '../../domain/use-cases/IGenerateReportUseCase';

export interface AgentElement {
  id: string;
  label: string;
  type: ComponentType;
}

export interface AgentConnection {
  fromElementId: string;
  toElementId: string;
  type: ConnectionType;
}

export interface AgentAnalysisInput {
  diagramId: string;
  elements: AgentElement[];
  connections: AgentConnection[];
  options: {
    analysisDepth: AnalysisDepth;
    includeRisks: boolean;
    includeRecommendations: boolean;
    language: string;
  };
}

export interface AgentComponent {
  name: string;
  type: ComponentType;
  description: string;
  observations: string;
}

export interface AgentRisk {
  title: string;
  description: string;
  severity: SeverityLevel;
  affectedComponents: string[];
}

export interface AgentRecommendation {
  title: string;
  description: string;
  priority: PriorityLevel;
  relatedRisks: string[];
}

export interface AgentAnalysisOutput {
  analysisId: string;
  status: 'completed' | 'failed';
  components: AgentComponent[];
  architecturePatterns: ArchitecturePattern[];
  risks: AgentRisk[];
  recommendations: AgentRecommendation[];
  summary: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface IArchitectureAnalysisAgentClient {
  analyze(input: AgentAnalysisInput): Promise<AgentAnalysisOutput>;
}
