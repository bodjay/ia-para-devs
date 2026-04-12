import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SessionProps } from '../../domain/entities/Session';
import { bffClient } from '../../infrastructure/api/bffClient';

export interface SessionRecord {
  id: string;
  name: string;
  createdAt: string;
  lastActiveAt: string;
  diagramId?: string;
}

export interface SessionsState {
  sessions: SessionRecord[];
  currentSessionId: string | null;
  filteredSessions: SessionRecord[];
  searchTerm: string;
  loading: boolean;
  error: string | null;
}

const initialState: SessionsState = {
  sessions: [],
  currentSessionId: null,
  filteredSessions: [],
  searchTerm: '',
  loading: false,
  error: null,
};

export const fetchSessions = createAsyncThunk(
  'sessions/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      return await bffClient.getSessions();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createSessionAsync = createAsyncThunk(
  'sessions/createSessionAsync',
  async (payload: { name: string; id?: string }, { rejectWithValue }) => {
    try {
      return await bffClient.createSession(payload.name, payload.id);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const loadLastActiveSession = createAsyncThunk(
  'sessions/loadLastActive',
  async (_, { getState, dispatch }) => {
    await dispatch(fetchSessions());
    const state = getState() as { sessions: SessionsState };
    const sessions = state.sessions.sessions;
    if (sessions.length > 0) {
      const sorted = [...sessions].sort(
        (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      );
      return sorted[0].id;
    }
    return null;
  }
);

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    createSession: (state, action: PayloadAction<{ name: string; id?: string }>) => {
      const now = new Date().toISOString();
      const session: SessionRecord = {
        id: action.payload.id ?? crypto.randomUUID(),
        name: action.payload.name,
        createdAt: now,
        lastActiveAt: now,
      };
      state.sessions.unshift(session);
      state.currentSessionId = session.id;
      state.filteredSessions = applyFilter(state.sessions, state.searchTerm);
    },
    selectSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    searchSessions: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      state.filteredSessions = applyFilter(state.sessions, action.payload);
    },
    updateSessionName: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const session = state.sessions.find((s) => s.id === action.payload.id);
      if (session) {
        session.name = action.payload.name;
        state.filteredSessions = applyFilter(state.sessions, state.searchTerm);
      }
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = state.sessions[0]?.id ?? null;
      }
      state.filteredSessions = applyFilter(state.sessions, state.searchTerm);
    },
    updateSessionLastActive: (state, action: PayloadAction<{ id: string; diagramId?: string }>) => {
      const session = state.sessions.find((s) => s.id === action.payload.id);
      if (session) {
        session.lastActiveAt = new Date().toISOString();
        if (action.payload.diagramId) {
          session.diagramId = action.payload.diagramId;
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload;
        state.filteredSessions = applyFilter(action.payload, state.searchTerm);
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadLastActiveSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentSessionId = action.payload;
        }
      })
      .addCase(createSessionAsync.fulfilled, (state, action) => {
        state.sessions.unshift(action.payload);
        state.currentSessionId = action.payload.id;
        state.filteredSessions = applyFilter(state.sessions, state.searchTerm);
      })
      .addCase(createSessionAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

function applyFilter(sessions: SessionRecord[], searchTerm: string): SessionRecord[] {
  if (!searchTerm.trim()) return sessions;
  const lower = searchTerm.toLowerCase();
  return sessions.filter((s) => s.name.toLowerCase().includes(lower));
}

export const {
  createSession,
  selectSession,
  searchSessions,
  updateSessionName,
  deleteSession,
  updateSessionLastActive,
  clearError,
} = sessionsSlice.actions;


export default sessionsSlice.reducer;
