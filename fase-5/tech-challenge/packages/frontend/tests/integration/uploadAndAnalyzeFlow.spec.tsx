import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import sessionsReducer from '../../src/application/store/sessionsSlice';
import chatReducer from '../../src/application/store/chatSlice';
import analysisReducer, {
  setStatus,
  setDiagramId,
  setAnalysisResult,
  setError,
  resetAnalysis,
} from '../../src/application/store/analysisSlice';
import { RootState } from '../../src/application/store';
import FileUpload from '../../src/presentation/components/FileUpload/FileUpload';
import ChatWindow from '../../src/presentation/components/ChatWindow/ChatWindow';
import Sidebar from '../../src/presentation/components/Sidebar/Sidebar';
import AnalysisResult from '../../src/presentation/components/AnalysisResult/AnalysisResult';
import { AnalysisResult as AnalysisResultType } from '../../src/domain/entities/Analysis';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

const SESSION_ID = 'integration-session-001';

const mockAnalysisResult: AnalysisResultType = {
  components: [
    { name: 'api-gateway', type: 'gateway', description: 'Entry point for client traffic' },
    { name: 'user-service', type: 'microservice', description: 'Authentication and user management' },
    { name: 'product-service', type: 'microservice', description: 'Product catalog and inventory' },
    { name: 'mongodb', type: 'database', description: 'Primary NoSQL data store' },
    { name: 'kafka', type: 'message-broker', description: 'Asynchronous event streaming' },
  ],
  risks: [
    { description: 'Single point of failure at API Gateway', severity: 'high' },
    { description: 'No circuit breaker between services', severity: 'medium' },
    { description: 'Missing monitoring dashboards', severity: 'low' },
  ],
  recommendations: [
    { description: 'Implement circuit breaker with Resilience4j', priority: 'high' },
    { description: 'Add distributed tracing', priority: 'medium' },
    { description: 'Set up Grafana dashboards', priority: 'low' },
  ],
  summary:
    'Production-ready microservices architecture with API Gateway, 2 domain services, MongoDB persistence, and Kafka event streaming. Requires resilience improvements.',
  patterns: ['Microservices', 'API Gateway', 'Event-Driven Architecture'],
};

const buildIntegrationStore = () =>
  configureStore({
    reducer: {
      sessions: sessionsReducer,
      chat: chatReducer,
      analysis: analysisReducer,
    },
    preloadedState: {
      sessions: {
        sessions: [
          {
            id: SESSION_ID,
            name: 'Sessão de Integração',
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        ],
        currentSessionId: SESSION_ID,
        filteredSessions: [],
        searchTerm: '',
        loading: false,
        error: null,
      },
      chat: {
        messages: [],
        currentSessionId: SESSION_ID,
        sending: false,
        error: null,
      },
      analysis: {
        status: 'idle',
        analysisId: null,
        diagramId: null,
        result: null,
        errorMessage: null,
      },
    } as any,
  });

interface AppProps {
  store: ReturnType<typeof buildIntegrationStore>;
  onUpload: (result: { file: File; previewUrl?: string }) => void;
}

const IntegrationApp: React.FC<AppProps> = ({ store, onUpload }) => {
  const analysisResult = store.getState().analysis.result;

  return (
    <Provider store={store}>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <FileUpload onUpload={onUpload} loading={store.getState().analysis.status === 'uploading'} />
          <ChatWindow sessionId={SESSION_ID} analysisResult={analysisResult} />
          {analysisResult && <AnalysisResult result={analysisResult} />}
        </div>
      </div>
    </Provider>
  );
};

const createFile = (name: string, type: string, size = 1024 * 1024): File => {
  const file = new File(['mock-content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('Integration: Upload and Analyze Flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should upload file, show processing state, then display analysis result', async () => {
    const store = buildIntegrationStore();

    const uploadResponse = { diagramId: 'diagram-micro-001', analysisId: 'analysis-001' };
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

    const handleUpload = jest.fn(async ({ file }: { file: File }) => {
      // Simulate the upload flow via store dispatch
      act(() => {
        store.dispatch(setStatus('uploading'));
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', SESSION_ID);

      const uploadRes = await fetch('/api/diagrams/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      act(() => {
        store.dispatch(setDiagramId(uploadData.diagramId));
        store.dispatch(setStatus('processing'));
      });

      const analysisRes = await fetch(`/api/analysis/${uploadData.analysisId}`);
      const analysisData = await analysisRes.json();

      act(() => {
        store.dispatch(
          setAnalysisResult({ analysisId: uploadData.analysisId, result: analysisData.result })
        );
      });
    });

    const { rerender } = render(
      <IntegrationApp store={store} onUpload={handleUpload} />
    );

    // Simulate uploading a file
    const fileInput = screen.getByTestId('file-input');
    const file = createFile('microservices-diagram.png', 'image/png');

    await userEvent.upload(fileInput, file);

    // Wait for the full flow to complete
    await waitFor(() => {
      expect(store.getState().analysis.status).toBe('completed');
    });

    expect(store.getState().analysis.diagramId).toBe('diagram-micro-001');
    expect(store.getState().analysis.result).toEqual(mockAnalysisResult);
  });

  it('should show error when BFF returns 400 on invalid file type', async () => {
    const store = buildIntegrationStore();

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: 'Unsupported file format. Only PNG, JPEG and PDF are allowed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const handleUpload = jest.fn(async ({ file }: { file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/diagrams/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        act(() => {
          store.dispatch(setError(err.message));
        });
      }
    });

    render(<IntegrationApp store={store} onUpload={handleUpload} />);

    const fileInput = screen.getByTestId('file-input');
    // Upload a valid file (validation happens on our component for type, so we test BFF error separately)
    const file = createFile('document.png', 'image/png');

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(store.getState().analysis.status).toBe('error');
      expect(store.getState().analysis.errorMessage).toContain('Unsupported file format');
    });
  });

  it('should show error when BFF returns 500', async () => {
    const store = buildIntegrationStore();

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: 'Internal server error. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const handleUpload = jest.fn(async ({ file }: { file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/diagrams/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        act(() => {
          store.dispatch(setError(err.message));
        });
      }
    });

    render(<IntegrationApp store={store} onUpload={handleUpload} />);

    const fileInput = screen.getByTestId('file-input');
    const file = createFile('arch.pdf', 'application/pdf');

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(store.getState().analysis.status).toBe('error');
      expect(store.getState().analysis.errorMessage).toContain('Internal server error');
    });
  });

  it('should persist session after analysis completes', async () => {
    const store = buildIntegrationStore();

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ diagramId: 'diagram-001', analysisId: 'analysis-001' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: mockAnalysisResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const handleUpload = jest.fn(async ({ file }: { file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/diagrams/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      act(() => {
        store.dispatch(setDiagramId(uploadData.diagramId));
      });

      const analysisRes = await fetch(`/api/analysis/${uploadData.analysisId}`);
      const analysisData = await analysisRes.json();

      act(() => {
        store.dispatch(
          setAnalysisResult({ analysisId: uploadData.analysisId, result: analysisData.result })
        );
      });
    });

    render(<IntegrationApp store={store} onUpload={handleUpload} />);

    const fileInput = screen.getByTestId('file-input');
    await userEvent.upload(fileInput, createFile('arch.png', 'image/png'));

    await waitFor(() => {
      const state = store.getState();
      expect(state.analysis.diagramId).toBe('diagram-001');
      expect(state.sessions.currentSessionId).toBe(SESSION_ID);
    });
  });

  it('should allow follow-up chat questions after initial analysis', async () => {
    const store = buildIntegrationStore();

    // Preload with completed analysis
    act(() => {
      store.dispatch(setAnalysisResult({ analysisId: 'analysis-001', result: mockAnalysisResult }));
    });

    const followUpResponse = {
      id: 'msg-follow-up',
      sessionId: SESSION_ID,
      content:
        'Os principais gargalos são: API Gateway sem load balancing e MongoDB sem replica set.',
      role: 'assistant' as const,
      timestamp: new Date().toISOString(),
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(followUpResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const handleUpload = jest.fn();

    render(<IntegrationApp store={store} onUpload={handleUpload} />);

    // Find the chat input and send a follow-up question
    const input = screen.getByRole('textbox', { name: /mensagem/i });
    await userEvent.type(input, 'Quais são os principais gargalos?');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/sessions/${SESSION_ID}/messages`),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    await waitFor(() => {
      const state = store.getState().chat;
      expect(state.messages.some((m) => m.content.includes('gargalos'))).toBe(true);
    });
  });
});
