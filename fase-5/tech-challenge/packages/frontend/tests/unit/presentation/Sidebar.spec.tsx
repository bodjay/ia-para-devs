import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Sidebar from '../../../src/presentation/components/Sidebar/Sidebar';
import sessionsReducer, {
  SessionsState,
  SessionRecord,
} from '../../../src/application/store/sessionsSlice';

const SESSION_RECORDS: SessionRecord[] = [
  {
    id: 'session-001',
    name: 'Análise de Microserviços',
    createdAt: '2024-01-10T08:00:00.000Z',
    lastActiveAt: '2024-01-12T10:00:00.000Z',
  },
  {
    id: 'session-002',
    name: 'API Gateway Review',
    createdAt: '2024-01-08T09:00:00.000Z',
    lastActiveAt: '2024-01-11T15:00:00.000Z',
  },
  {
    id: 'session-003',
    name: 'Database Schema Analysis',
    createdAt: '2024-01-05T07:00:00.000Z',
    lastActiveAt: '2024-01-09T11:00:00.000Z',
  },
];

const buildStore = (sessionsState: Partial<SessionsState> = {}) =>
  configureStore({
    reducer: { sessions: sessionsReducer },
    preloadedState: {
      sessions: {
        sessions: SESSION_RECORDS,
        currentSessionId: 'session-001',
        filteredSessions: [],
        searchTerm: '',
        loading: false,
        error: null,
        ...sessionsState,
      },
    } as any,
  });

const renderSidebar = (
  sessionsState: Partial<SessionsState> = {},
  props: Partial<React.ComponentProps<typeof Sidebar>> = {}
) => {
  const store = buildStore(sessionsState);
  return {
    store,
    ...render(
      <Provider store={store}>
        <Sidebar {...props} />
      </Provider>
    ),
  };
};

describe('Sidebar component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render sidebar with session list', () => {
      renderSidebar();

      expect(screen.getByText('Análise de Microserviços')).toBeInTheDocument();
      expect(screen.getByText('API Gateway Review')).toBeInTheDocument();
      expect(screen.getByText('Database Schema Analysis')).toBeInTheDocument();
    });

    it('should display "Nova Sessão" button', () => {
      renderSidebar();

      expect(screen.getByRole('button', { name: /nova sessão/i })).toBeInTheDocument();
    });

    it('should render search input field', () => {
      renderSidebar();

      expect(screen.getByRole('textbox', { name: /buscar/i })).toBeInTheDocument();
    });

    it('should display session name and date', () => {
      renderSidebar();

      expect(screen.getByText('Análise de Microserviços')).toBeInTheDocument();
      // The date is formatted as pt-BR locale
      const dateText = new Date('2024-01-12T10:00:00.000Z').toLocaleDateString('pt-BR');
      expect(screen.getByText(dateText)).toBeInTheDocument();
    });

    it('should show empty state when no sessions exist', () => {
      renderSidebar({ sessions: [], filteredSessions: [] });

      expect(screen.getByText(/nenhuma sessão encontrada/i)).toBeInTheDocument();
    });
  });

  describe('active session', () => {
    it('should highlight current active session', () => {
      renderSidebar({ currentSessionId: 'session-001' });

      const activeSession = screen.getByText('Análise de Microserviços').closest('[aria-current="true"]');
      expect(activeSession).toBeInTheDocument();
    });
  });

  describe('creating sessions', () => {
    it('should create new session when "Nova Sessão" is clicked', async () => {
      const { store } = renderSidebar();

      const button = screen.getByRole('button', { name: /nova sessão/i });
      await userEvent.click(button);

      const state = store.getState().sessions;
      expect(state.sessions.length).toBeGreaterThan(SESSION_RECORDS.length);
    });

    it('should set newly created session as current', async () => {
      const { store } = renderSidebar();
      const initialCurrentId = store.getState().sessions.currentSessionId;

      const button = screen.getByRole('button', { name: /nova sessão/i });
      await userEvent.click(button);

      const newCurrentId = store.getState().sessions.currentSessionId;
      expect(newCurrentId).not.toBe(initialCurrentId);
    });

    it('should call onSessionCreate callback when new session is created', async () => {
      const onSessionCreate = jest.fn();
      renderSidebar({}, { onSessionCreate });

      await userEvent.click(screen.getByRole('button', { name: /nova sessão/i }));

      expect(onSessionCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation', () => {
    it('should navigate to session when clicked', async () => {
      const onSessionSelect = jest.fn();
      const { store } = renderSidebar({ currentSessionId: 'session-001' }, { onSessionSelect });

      await userEvent.click(screen.getByText('API Gateway Review'));

      expect(store.getState().sessions.currentSessionId).toBe('session-002');
      expect(onSessionSelect).toHaveBeenCalledWith('session-002');
    });
  });

  describe('search', () => {
    it('should filter sessions in real-time as user types in search', async () => {
      const { store } = renderSidebar();
      const searchInput = screen.getByRole('textbox', { name: /buscar/i });

      await userEvent.type(searchInput, 'micro');

      const state = store.getState().sessions;
      expect(state.filteredSessions).toHaveLength(1);
      expect(state.filteredSessions[0].name).toBe('Análise de Microserviços');
    });

    it('should update store searchTerm when user types', async () => {
      const { store } = renderSidebar();
      const searchInput = screen.getByRole('textbox', { name: /buscar/i });

      await userEvent.type(searchInput, 'API');

      expect(store.getState().sessions.searchTerm).toBe('API');
    });
  });

  describe('session ordering', () => {
    it('should show most recent session first', () => {
      renderSidebar();

      const sessionItems = screen.getAllByRole('option').length > 0
        ? screen.getAllByRole('option')
        : document.querySelectorAll('[data-testid^="session-"]');

      // The most recent session (lastActiveAt: 2024-01-12) should appear first
      const allText = document.body.textContent ?? '';
      const microservicesIndex = allText.indexOf('Análise de Microserviços');
      const apiGatewayIndex = allText.indexOf('API Gateway Review');

      expect(microservicesIndex).toBeLessThan(apiGatewayIndex);
    });
  });
});
