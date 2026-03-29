import { configureStore } from '@reduxjs/toolkit';
import analysisReducer, {
  AnalysisState,
  setStatus,
  setDiagramId,
  setAnalysisResult,
  setError,
  resetAnalysis,
  uploadAndAnalyzeDiagram,
} from '../../../src/application/store/analysisSlice';
import { AnalysisResult } from '../../../src/domain/entities/Analysis';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const buildStore = (preloadedState?: { analysis: Partial<AnalysisState> }) =>
  configureStore({
    reducer: { analysis: analysisReducer },
    preloadedState: preloadedState as any,
  });

const mockAnalysisResult: AnalysisResult = {
  components: [
    { name: 'api-gateway', type: 'gateway', description: 'Entry point for all client requests' },
    { name: 'user-service', type: 'microservice', description: 'Manages user authentication and profiles' },
    { name: 'product-service', type: 'microservice', description: 'Handles product catalog and inventory' },
    { name: 'mongodb', type: 'database', description: 'NoSQL database for persistent storage' },
    { name: 'kafka', type: 'message-broker', description: 'Async event streaming platform' },
  ],
  risks: [
    { description: 'Single point of failure in API Gateway', severity: 'high', affectedComponents: ['api-gateway'] },
    { description: 'No rate limiting configured', severity: 'medium', affectedComponents: ['api-gateway', 'user-service'] },
    { description: 'Missing health checks for kafka consumers', severity: 'low', affectedComponents: ['kafka'] },
  ],
  recommendations: [
    { description: 'Implement circuit breaker pattern for service resilience', priority: 'high' },
    { description: 'Add distributed tracing with OpenTelemetry', priority: 'medium' },
    { description: 'Consider CQRS pattern for read/write separation', priority: 'low' },
  ],
  summary:
    'Microservices architecture with 3 services behind an API Gateway. Uses MongoDB for persistence and Kafka for async communication. Overall architecture is well-structured but lacks resilience patterns.',
  patterns: ['Microservices', 'API Gateway', 'Event-Driven Architecture'],
};

describe('analysisSlice', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with idle status', () => {
      const store = buildStore();
      const state = store.getState().analysis;

      expect(state.status).toBe('idle');
      expect(state.analysisId).toBeNull();
      expect(state.diagramId).toBeNull();
      expect(state.result).toBeNull();
      expect(state.errorMessage).toBeNull();
    });
  });

  describe('setStatus', () => {
    it('should set status to "uploading" when file is selected', () => {
      const store = buildStore();
      store.dispatch(setStatus('uploading'));
      expect(store.getState().analysis.status).toBe('uploading');
    });

    it('should set status to "processing" after file upload', () => {
      const store = buildStore();
      store.dispatch(setStatus('processing'));
      expect(store.getState().analysis.status).toBe('processing');
    });

    it('should set status to "responding" when analysis is in progress', () => {
      const store = buildStore();
      store.dispatch(setStatus('responding'));
      expect(store.getState().analysis.status).toBe('responding');
    });
  });

  describe('setAnalysisResult', () => {
    it('should set status to "completed" with full analysis result', () => {
      const store = buildStore();
      store.dispatch(
        setAnalysisResult({
          analysisId: 'analysis-001',
          result: mockAnalysisResult,
        })
      );

      const state = store.getState().analysis;
      expect(state.status).toBe('completed');
      expect(state.analysisId).toBe('analysis-001');
      expect(state.result).toEqual(mockAnalysisResult);
    });

    it('should store analysis result with components', () => {
      const store = buildStore();
      store.dispatch(setAnalysisResult({ analysisId: 'analysis-001', result: mockAnalysisResult }));

      const { result } = store.getState().analysis;
      expect(result?.components).toHaveLength(5);
      expect(result?.components[0].name).toBe('api-gateway');
      expect(result?.components[0].type).toBe('gateway');
      expect(result?.components[1].name).toBe('user-service');
    });

    it('should store analysis result with risks and severities', () => {
      const store = buildStore();
      store.dispatch(setAnalysisResult({ analysisId: 'analysis-001', result: mockAnalysisResult }));

      const { result } = store.getState().analysis;
      expect(result?.risks).toHaveLength(3);
      expect(result?.risks[0].severity).toBe('high');
      expect(result?.risks[1].severity).toBe('medium');
      expect(result?.risks[2].severity).toBe('low');
    });

    it('should store analysis result with recommendations and priorities', () => {
      const store = buildStore();
      store.dispatch(setAnalysisResult({ analysisId: 'analysis-001', result: mockAnalysisResult }));

      const { result } = store.getState().analysis;
      expect(result?.recommendations).toHaveLength(3);
      expect(result?.recommendations[0].priority).toBe('high');
      expect(result?.recommendations[0].description).toContain('circuit breaker');
    });

    it('should store summary in analysis result', () => {
      const store = buildStore();
      store.dispatch(setAnalysisResult({ analysisId: 'analysis-001', result: mockAnalysisResult }));

      const { result } = store.getState().analysis;
      expect(result?.summary).toContain('Microservices architecture');
      expect(result?.summary).toContain('MongoDB');
    });

    it('should clear error message when analysis result is set', () => {
      const store = buildStore({
        analysis: {
          status: 'error',
          analysisId: null,
          diagramId: null,
          result: null,
          errorMessage: 'Previous error',
        },
      });

      store.dispatch(setAnalysisResult({ analysisId: 'analysis-001', result: mockAnalysisResult }));

      expect(store.getState().analysis.errorMessage).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set status to "error" with error message on failure', () => {
      const store = buildStore();
      store.dispatch(setError('Failed to process diagram. Please try again.'));

      const state = store.getState().analysis;
      expect(state.status).toBe('error');
      expect(state.errorMessage).toBe('Failed to process diagram. Please try again.');
    });
  });

  describe('resetAnalysis', () => {
    it('should reset to idle on new session creation', () => {
      const store = buildStore({
        analysis: {
          status: 'completed',
          analysisId: 'analysis-001',
          diagramId: 'diagram-001',
          result: mockAnalysisResult,
          errorMessage: null,
        },
      });

      store.dispatch(resetAnalysis());

      const state = store.getState().analysis;
      expect(state.status).toBe('idle');
      expect(state.analysisId).toBeNull();
      expect(state.diagramId).toBeNull();
      expect(state.result).toBeNull();
      expect(state.errorMessage).toBeNull();
    });
  });

  describe('setDiagramId', () => {
    it('should store diagramId when file is uploaded', () => {
      const store = buildStore();
      store.dispatch(setDiagramId('diagram-microservices-001'));

      expect(store.getState().analysis.diagramId).toBe('diagram-microservices-001');
    });
  });

  describe('uploadAndAnalyzeDiagram (async thunk)', () => {
    const createMockFile = (name = 'arch.png', type = 'image/png', size = 1024 * 1024): File => {
      const file = new File(['mock content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('should go through full upload and analysis flow on success', async () => {
      const uploadResponse = { diagramId: 'diagram-001', analysisId: 'analysis-001' };
      const analysisResponse = { result: mockAnalysisResult };

      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(uploadResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(analysisResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const store = buildStore();
      await store.dispatch(
        uploadAndAnalyzeDiagram({ sessionId: 'session-001', file: createMockFile() })
      );

      const state = store.getState().analysis;
      expect(state.status).toBe('completed');
      expect(state.diagramId).toBe('diagram-001');
      expect(state.analysisId).toBe('analysis-001');
      expect(state.result).toEqual(mockAnalysisResult);
    });

    it('should set error state when upload fails with server error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Invalid file format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const store = buildStore();
      await store.dispatch(
        uploadAndAnalyzeDiagram({ sessionId: 'session-001', file: createMockFile('bad.txt', 'text/plain') })
      );

      const state = store.getState().analysis;
      expect(state.status).toBe('error');
      expect(state.errorMessage).toBeTruthy();
    });
  });
});
