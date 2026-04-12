import { configureStore } from '@reduxjs/toolkit';
import sessionsReducer, {
  SessionsState,
  createSession,
  selectSession,
  searchSessions,
  updateSessionName,
  deleteSession,
  fetchSessions,
  SessionRecord,
} from '../../../src/application/store/sessionsSlice';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const buildStore = (preloadedState?: { sessions: Partial<SessionsState> }) =>
  configureStore({
    reducer: { sessions: sessionsReducer },
    preloadedState: preloadedState as any,
  });

const makeMockSession = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: 'session-001',
  name: 'Sessão 1',
  createdAt: '2024-01-10T08:00:00.000Z',
  lastActiveAt: '2024-01-10T10:00:00.000Z',
  ...overrides,
});

describe('sessionsSlice', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with empty sessions list', () => {
      const store = buildStore();
      const state = store.getState().sessions;

      expect(state.sessions).toEqual([]);
      expect(state.currentSessionId).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.searchTerm).toBe('');
    });
  });

  describe('createSession', () => {
    it('should add a new session on createSession action', () => {
      const store = buildStore();
      store.dispatch(createSession({ name: 'Nova Sessão' }));

      const state = store.getState().sessions;
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0].name).toBe('Nova Sessão');
      expect(state.sessions[0].id).toBeDefined();
    });

    it('should set currentSessionId to the newly created session', () => {
      const store = buildStore();
      store.dispatch(createSession({ name: 'Nova Sessão' }));

      const state = store.getState().sessions;
      expect(state.currentSessionId).toBe(state.sessions[0].id);
    });

    it('should use provided id when creating session', () => {
      const store = buildStore();
      store.dispatch(createSession({ name: 'Sessão Custom', id: 'custom-id-001' }));

      const state = store.getState().sessions;
      expect(state.sessions[0].id).toBe('custom-id-001');
    });

    it('should add session at the beginning of the list', () => {
      const store = buildStore({
        sessions: {
          sessions: [makeMockSession({ id: 'existing-001', name: 'Sessão Antiga' })],
          currentSessionId: 'existing-001',
          filteredSessions: [],
          searchTerm: '',
          loading: false,
          error: null,
        },
      });

      store.dispatch(createSession({ name: 'Nova Sessão' }));
      const state = store.getState().sessions;

      expect(state.sessions[0].name).toBe('Nova Sessão');
      expect(state.sessions[1].name).toBe('Sessão Antiga');
    });
  });

  describe('selectSession', () => {
    it('should set currentSessionId on selectSession action', () => {
      const store = buildStore({
        sessions: {
          sessions: [
            makeMockSession({ id: 'session-001' }),
            makeMockSession({ id: 'session-002', name: 'Sessão 2' }),
          ],
          currentSessionId: 'session-001',
          filteredSessions: [],
          searchTerm: '',
          loading: false,
          error: null,
        },
      });

      store.dispatch(selectSession('session-002'));
      expect(store.getState().sessions.currentSessionId).toBe('session-002');
    });
  });

  describe('searchSessions', () => {
    it('should filter sessions by search term on searchSessions action', () => {
      const store = buildStore({
        sessions: {
          sessions: [
            makeMockSession({ id: 's1', name: 'Análise Microserviços' }),
            makeMockSession({ id: 's2', name: 'API Gateway Review' }),
            makeMockSession({ id: 's3', name: 'Database Schema' }),
          ],
          currentSessionId: null,
          filteredSessions: [],
          searchTerm: '',
          loading: false,
          error: null,
        },
      });

      store.dispatch(searchSessions('micro'));

      const state = store.getState().sessions;
      expect(state.filteredSessions).toHaveLength(1);
      expect(state.filteredSessions[0].name).toBe('Análise Microserviços');
      expect(state.searchTerm).toBe('micro');
    });

    it('should be case-insensitive when filtering', () => {
      const store = buildStore({
        sessions: {
          sessions: [
            makeMockSession({ id: 's1', name: 'API Gateway' }),
            makeMockSession({ id: 's2', name: 'Database' }),
          ],
          currentSessionId: null,
          filteredSessions: [],
          searchTerm: '',
          loading: false,
          error: null,
        },
      });

      store.dispatch(searchSessions('api'));

      expect(store.getState().sessions.filteredSessions).toHaveLength(1);
      expect(store.getState().sessions.filteredSessions[0].name).toBe('API Gateway');
    });

    it('should return all sessions when search term is cleared', () => {
      const store = buildStore({
        sessions: {
          sessions: [
            makeMockSession({ id: 's1', name: 'Session A' }),
            makeMockSession({ id: 's2', name: 'Session B' }),
          ],
          currentSessionId: null,
          filteredSessions: [],
          searchTerm: 'A',
          loading: false,
          error: null,
        },
      });

      store.dispatch(searchSessions(''));

      const state = store.getState().sessions;
      expect(state.filteredSessions).toHaveLength(2);
    });
  });

  describe('fetchSessions (async thunk)', () => {
    it('should set loading state during session fetch', async () => {
      let resolvePromise!: (value: Response) => void;
      mockFetch.mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const store = buildStore();
      const fetchPromise = store.dispatch(fetchSessions());

      expect(store.getState().sessions.loading).toBe(true);
      expect(store.getState().sessions.error).toBeNull();

      resolvePromise(
        new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await fetchPromise;
    });

    it('should load sessions after successful fetch', async () => {
      const mockSessions: SessionRecord[] = [
        makeMockSession({ id: 's1', name: 'Sessão Remota 1' }),
        makeMockSession({ id: 's2', name: 'Sessão Remota 2' }),
      ];

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockSessions), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const store = buildStore();
      await store.dispatch(fetchSessions());

      const state = store.getState().sessions;
      expect(state.sessions).toHaveLength(2);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetch error and set error state', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const store = buildStore();
      await store.dispatch(fetchSessions());

      const state = store.getState().sessions;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('updateSessionName', () => {
    it('should update session name', () => {
      const store = buildStore({
        sessions: {
          sessions: [makeMockSession({ id: 'session-001', name: 'Old Name' })],
          currentSessionId: 'session-001',
          filteredSessions: [],
          searchTerm: '',
          loading: false,
          error: null,
        },
      });

      store.dispatch(updateSessionName({ id: 'session-001', name: 'New Name' }));

      const session = store.getState().sessions.sessions.find((s) => s.id === 'session-001');
      expect(session?.name).toBe('New Name');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', () => {
      const store = buildStore({
        sessions: {
          sessions: [
            makeMockSession({ id: 'session-001', name: 'Sessão 1' }),
            makeMockSession({ id: 'session-002', name: 'Sessão 2' }),
          ],
          currentSessionId: 'session-001',
          filteredSessions: [],
          searchTerm: '',
          loading: false,
          error: null,
        },
      });

      store.dispatch(deleteSession('session-002'));

      const state = store.getState().sessions;
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0].id).toBe('session-001');
    });

    it('should set currentSessionId to first remaining session when current is deleted', () => {
      const store = buildStore({
        sessions: {
          sessions: [
            makeMockSession({ id: 'session-001', name: 'Sessão 1' }),
            makeMockSession({ id: 'session-002', name: 'Sessão 2' }),
          ],
          currentSessionId: 'session-001',
          filteredSessions: [],
          searchTerm: '',
          loading: false,
          error: null,
        },
      });

      store.dispatch(deleteSession('session-001'));

      const state = store.getState().sessions;
      expect(state.currentSessionId).toBe('session-002');
    });

    it('should set currentSessionId to null when last session is deleted', () => {
      const store = buildStore({
        sessions: {
          sessions: [makeMockSession({ id: 'session-001' })],
          currentSessionId: 'session-001',
          filteredSessions: [],
          searchTerm: '',
          loading: false,
          error: null,
        },
      });

      store.dispatch(deleteSession('session-001'));

      expect(store.getState().sessions.currentSessionId).toBeNull();
    });
  });

  describe('auto-load last session', () => {
    it('should load last active session on app start', async () => {
      const sessions: SessionRecord[] = [
        makeMockSession({ id: 's1', name: 'Sessão 1', lastActiveAt: '2024-01-10T08:00:00.000Z' }),
        makeMockSession({ id: 's2', name: 'Sessão 2', lastActiveAt: '2024-01-12T10:00:00.000Z' }),
        makeMockSession({ id: 's3', name: 'Sessão 3', lastActiveAt: '2024-01-11T09:00:00.000Z' }),
      ];

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(sessions), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const store = buildStore();
      await store.dispatch(fetchSessions());

      // Simulate auto-loading the most recent session
      const state = store.getState().sessions;
      const mostRecent = [...state.sessions].sort(
        (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      )[0];

      store.dispatch(selectSession(mostRecent.id));

      expect(store.getState().sessions.currentSessionId).toBe('s2');
    });
  });
});
