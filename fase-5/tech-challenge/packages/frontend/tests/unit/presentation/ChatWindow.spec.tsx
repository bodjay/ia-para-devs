import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ChatWindow from '../../../src/presentation/components/ChatWindow/ChatWindow';
import chatReducer, { ChatMessage, ChatState } from '../../../src/application/store/chatSlice';
import analysisReducer, { AnalysisState } from '../../../src/application/store/analysisSlice';
import { AnalysisResult } from '../../../src/domain/entities/Analysis';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const SESSION_ID = 'session-test-001';

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-001',
    sessionId: SESSION_ID,
    content: 'Analise este diagrama de microserviços',
    role: 'user',
    timestamp: '2024-01-15T10:00:00.000Z',
    attachments: [{ diagramId: 'diagram-001', fileName: 'microservices.png', fileType: 'image/png' }],
  },
  {
    id: 'msg-002',
    sessionId: SESSION_ID,
    content: 'Identifiquei os seguintes componentes: api-gateway, user-service, product-service, mongodb e kafka.',
    role: 'assistant',
    timestamp: '2024-01-15T10:01:00.000Z',
  },
];

const mockAnalysisResult: AnalysisResult = {
  components: [
    { name: 'api-gateway', type: 'gateway' },
    { name: 'user-service', type: 'microservice' },
    { name: 'product-service', type: 'microservice' },
    { name: 'mongodb', type: 'database' },
    { name: 'kafka', type: 'message-broker' },
  ],
  risks: [
    { description: 'Single point of failure in API Gateway', severity: 'high' },
    { description: 'No rate limiting configured', severity: 'medium' },
    { description: 'Missing health checks', severity: 'low' },
  ],
  recommendations: [
    { description: 'Implement circuit breaker pattern', priority: 'high' },
    { description: 'Add distributed tracing', priority: 'medium' },
    { description: 'Consider CQRS pattern', priority: 'low' },
  ],
  summary: 'Microservices architecture with 3 services behind an API Gateway using MongoDB and Kafka.',
};

const buildStore = (
  chatState: Partial<ChatState> = {},
  analysisState: Partial<AnalysisState> = {}
) =>
  configureStore({
    reducer: { chat: chatReducer, analysis: analysisReducer },
    preloadedState: {
      chat: {
        messages: [],
        currentSessionId: SESSION_ID,
        sending: false,
        error: null,
        ...chatState,
      },
      analysis: {
        status: 'idle',
        analysisId: null,
        diagramId: null,
        result: null,
        errorMessage: null,
        ...analysisState,
      },
    } as any,
  });

const renderChatWindow = (
  chatState: Partial<ChatState> = {},
  analysisState: Partial<AnalysisState> = {},
  props: Partial<React.ComponentProps<typeof ChatWindow>> = {}
) => {
  const store = buildStore(chatState, analysisState);
  return render(
    <Provider store={store}>
      <ChatWindow sessionId={SESSION_ID} {...props} />
    </Provider>
  );
};

describe('ChatWindow component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    it('should render empty chat when no messages', () => {
      renderChatWindow();

      expect(screen.getByTestId('empty-chat')).toBeInTheDocument();
      expect(screen.getByText(/nenhuma mensagem ainda/i)).toBeInTheDocument();
    });
  });

  describe('messages rendering', () => {
    it('should render user messages', () => {
      renderChatWindow({ messages: mockMessages });

      const userMessages = screen.getAllByTestId('message-user');
      expect(userMessages.length).toBeGreaterThan(0);
      expect(screen.getByText(/analise este diagrama/i)).toBeInTheDocument();
    });

    it('should render assistant messages', () => {
      renderChatWindow({ messages: mockMessages });

      const assistantMessages = screen.getAllByTestId('message-assistant');
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(screen.getByText(/identifiquei os seguintes componentes/i)).toBeInTheDocument();
    });

    it('should render markdown content in assistant messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-md',
          sessionId: SESSION_ID,
          content: '**Componentes identificados:**\n- api-gateway\n- user-service',
          role: 'assistant',
          timestamp: new Date().toISOString(),
        },
      ];
      renderChatWindow({ messages });

      expect(screen.getByText(/componentes identificados/i)).toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should show "Analisando diagrama..." loading indicator during processing', () => {
      renderChatWindow({}, { status: 'processing' });

      expect(screen.getByTestId('processing-indicator')).toBeInTheDocument();
      expect(screen.getByText(/analisando diagrama/i)).toBeInTheDocument();
    });

    it('should show "Analisando diagrama..." during uploading state too', () => {
      renderChatWindow({}, { status: 'uploading' });

      expect(screen.getByTestId('processing-indicator')).toBeInTheDocument();
    });

    it('should show typing indicator when assistant is responding', () => {
      renderChatWindow({ sending: true }, { status: 'idle' });

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
      expect(screen.getByText(/digitando/i)).toBeInTheDocument();
    });
  });

  describe('analysis result display', () => {
    it('should show analysis result with components list', () => {
      renderChatWindow({}, {}, { analysisResult: mockAnalysisResult });

      expect(screen.getByText('api-gateway')).toBeInTheDocument();
      expect(screen.getByText('user-service')).toBeInTheDocument();
      expect(screen.getByText('product-service')).toBeInTheDocument();
      expect(screen.getByText('mongodb')).toBeInTheDocument();
      expect(screen.getByText('kafka')).toBeInTheDocument();
    });

    it('should show risks with severity badges (low/medium/high)', () => {
      renderChatWindow({}, {}, { analysisResult: mockAnalysisResult });

      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
    });

    it('should show recommendations with priority badges', () => {
      renderChatWindow({}, {}, { analysisResult: mockAnalysisResult });

      expect(screen.getByText(/circuit breaker/i)).toBeInTheDocument();
      expect(screen.getByText(/distributed tracing/i)).toBeInTheDocument();
    });

    it('should display summary section', () => {
      renderChatWindow({}, {}, { analysisResult: mockAnalysisResult });

      expect(screen.getByText(/mongodb and kafka/i)).toBeInTheDocument();
    });
  });

  describe('message input', () => {
    it('should allow sending a chat message via input', async () => {
      const assistantResponse: ChatMessage = {
        id: 'msg-response',
        sessionId: SESSION_ID,
        content: 'Os gargalos identificados são: API Gateway e MongoDB.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(assistantResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      renderChatWindow();

      const input = screen.getByRole('textbox', { name: /mensagem/i });
      await userEvent.type(input, 'Quais são os gargalos?');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/sessions/${SESSION_ID}/messages`),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should clear input after message is sent', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'new-msg',
            sessionId: SESSION_ID,
            content: 'response',
            role: 'assistant',
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      renderChatWindow();

      const input = screen.getByRole('textbox', { name: /mensagem/i });
      await userEvent.type(input, 'Minha pergunta aqui');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should disable input while processing', () => {
      renderChatWindow({}, { status: 'processing' });

      const input = screen.getByRole('textbox', { name: /mensagem/i });
      expect(input).toBeDisabled();
    });

    it('should disable send button while input is empty', () => {
      renderChatWindow();

      const sendButton = screen.getByRole('button', { name: /enviar mensagem/i });
      expect(sendButton).toBeDisabled();
    });

    it('should show error message on failed request', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const store = buildStore();
      const { rerender } = render(
        <Provider store={store}>
          <ChatWindow sessionId={SESSION_ID} />
        </Provider>
      );

      const input = screen.getByRole('textbox', { name: /mensagem/i });
      await userEvent.type(input, 'Test question');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        const state = store.getState();
        expect(state.chat.error).toBeTruthy();
      });
    });
  });
});
