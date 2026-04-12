import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AnalysisResult from '../../../src/presentation/components/AnalysisResult/AnalysisResult';
import { AnalysisResult as AnalysisResultType } from '../../../src/domain/entities/Analysis';

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

const mockResult: AnalysisResultType = {
  components: [
    { name: 'api-gateway', type: 'gateway', description: 'Entry point for all requests' },
    { name: 'user-service', type: 'microservice', description: 'Manages user accounts' },
    { name: 'product-service', type: 'microservice', description: 'Product catalog management' },
    { name: 'mongodb', type: 'database', description: 'Primary data store' },
    { name: 'kafka', type: 'message-broker', description: 'Async event streaming' },
  ],
  risks: [
    {
      description: 'Single point of failure at the API Gateway layer',
      severity: 'high',
      affectedComponents: ['api-gateway'],
    },
    {
      description: 'No rate limiting may cause service overload',
      severity: 'medium',
      affectedComponents: ['api-gateway', 'user-service'],
    },
    {
      description: 'Missing health check endpoints for Kafka consumers',
      severity: 'low',
      affectedComponents: ['kafka'],
    },
  ],
  recommendations: [
    {
      description: 'Implement circuit breaker pattern using Resilience4j or Hystrix',
      priority: 'high',
    },
    {
      description: 'Add distributed tracing with OpenTelemetry',
      priority: 'medium',
    },
    {
      description: 'Consider CQRS pattern for better read/write separation',
      priority: 'low',
    },
  ],
  summary:
    'This is a well-structured microservices architecture with 3 domain services behind an API Gateway. MongoDB handles persistence and Kafka enables asynchronous communication between services.',
  patterns: ['Microservices', 'API Gateway', 'Event-Driven Architecture', 'SAGA pattern'],
};

describe('AnalysisResult component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    it('should show empty state when no analysis is available', () => {
      render(<AnalysisResult result={null} />);

      expect(screen.getByTestId('analysis-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/nenhuma análise disponível/i)).toBeInTheDocument();
    });
  });

  describe('components section', () => {
    it('should render components section with component names and types', () => {
      render(<AnalysisResult result={mockResult} />);

      expect(screen.getByText('api-gateway')).toBeInTheDocument();
      expect(screen.getByText('user-service')).toBeInTheDocument();
      expect(screen.getByText('product-service')).toBeInTheDocument();
      expect(screen.getByText('mongodb')).toBeInTheDocument();
      expect(screen.getByText('kafka')).toBeInTheDocument();

      expect(screen.getByText('gateway')).toBeInTheDocument();
      expect(screen.getAllByText('microservice')).toHaveLength(2);
      expect(screen.getByText('database')).toBeInTheDocument();
      expect(screen.getByText('message-broker')).toBeInTheDocument();
    });
  });

  describe('risks section', () => {
    it('should render risks section with severity indicators', () => {
      render(<AnalysisResult result={mockResult} />);

      expect(screen.getByTestId('section-riscos')).toBeInTheDocument();
      expect(screen.getByText(/single point of failure/i)).toBeInTheDocument();
      expect(screen.getByText(/rate limiting/i)).toBeInTheDocument();
      expect(screen.getByText(/health check/i)).toBeInTheDocument();
    });

    it('should show red indicator for high severity risk', () => {
      render(<AnalysisResult result={mockResult} />);

      const highIndicator = screen.getByTestId('risk-indicator-high');
      expect(highIndicator).toBeInTheDocument();
      expect(highIndicator).toHaveStyle({ backgroundColor: '#d32f2f' });
    });

    it('should show yellow indicator for medium severity risk', () => {
      render(<AnalysisResult result={mockResult} />);

      const mediumIndicator = screen.getByTestId('risk-indicator-medium');
      expect(mediumIndicator).toBeInTheDocument();
      expect(mediumIndicator).toHaveStyle({ backgroundColor: '#f57c00' });
    });

    it('should show green indicator for low severity risk', () => {
      render(<AnalysisResult result={mockResult} />);

      const lowIndicator = screen.getByTestId('risk-indicator-low');
      expect(lowIndicator).toBeInTheDocument();
      expect(lowIndicator).toHaveStyle({ backgroundColor: '#388e3c' });
    });
  });

  describe('recommendations section', () => {
    it('should render recommendations section with priorities', () => {
      render(<AnalysisResult result={mockResult} />);

      expect(screen.getByTestId('section-recomendacoes')).toBeInTheDocument();
      expect(screen.getByText(/circuit breaker/i)).toBeInTheDocument();
      expect(screen.getByText(/OpenTelemetry/i)).toBeInTheDocument();
      expect(screen.getByText(/CQRS/i)).toBeInTheDocument();
    });
  });

  describe('summary section', () => {
    it('should render architecture summary', () => {
      render(<AnalysisResult result={mockResult} />);

      expect(screen.getByTestId('section-visao-geral')).toBeInTheDocument();
      expect(screen.getByText(/microservices architecture/i)).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should show "Copiar" button to copy documentation', () => {
      render(<AnalysisResult result={mockResult} />);

      expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument();
    });

    it('should copy content to clipboard when "Copiar" is clicked', async () => {
      render(<AnalysisResult result={mockResult} />);

      const copyButton = screen.getByRole('button', { name: /copiar/i });
      await userEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      const copiedText = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
      expect(copiedText).toContain('Visão Geral');
      expect(copiedText).toContain(mockResult.summary);
    });

    it('should include components in copied text', async () => {
      render(<AnalysisResult result={mockResult} />);

      await userEvent.click(screen.getByRole('button', { name: /copiar/i }));

      const copiedText = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
      expect(copiedText).toContain('api-gateway');
      expect(copiedText).toContain('Componentes');
    });
  });

  describe('sections organization', () => {
    it('should organize content in sections (Visão Geral, Componentes, Fluxos, Riscos)', () => {
      render(<AnalysisResult result={mockResult} />);

      expect(screen.getByText('Visão Geral')).toBeInTheDocument();
      expect(screen.getByText('Componentes')).toBeInTheDocument();
      expect(screen.getByText('Riscos')).toBeInTheDocument();
      expect(screen.getByText('Recomendações')).toBeInTheDocument();
    });
  });

  describe('patterns section', () => {
    it('should render patterns section when patterns are present', () => {
      render(<AnalysisResult result={mockResult} />);

      const patternsSection = screen.getByTestId('section-padroes');
      expect(patternsSection).toBeInTheDocument();
      expect(within(patternsSection).getByText(/microservices/i)).toBeInTheDocument();
      expect(within(patternsSection).getByText(/API Gateway/)).toBeInTheDocument();
      expect(within(patternsSection).getByText(/Event-Driven/i)).toBeInTheDocument();
    });

    it('should not render patterns section when patterns are absent', () => {
      const resultWithoutPatterns: AnalysisResultType = { ...mockResult, patterns: undefined };
      render(<AnalysisResult result={resultWithoutPatterns} />);

      expect(screen.queryByTestId('section-padroes')).not.toBeInTheDocument();
    });
  });
});
