import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MessageRole, MessageAttachment } from '../../domain/entities/Message';

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: MessageRole;
  timestamp: string;
  attachments?: MessageAttachment[];
}

export interface ChatState {
  messages: ChatMessage[];
  currentSessionId: string | null;
  sending: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  currentSessionId: null,
  sending: false,
  error: null,
};

export interface SendMessagePayload {
  sessionId: string;
  content: string;
  attachments?: MessageAttachment[];
}

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (payload: SendMessagePayload, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/sessions/${payload.sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload.content, attachments: payload.attachments }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message ?? `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data as ChatMessage;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const loadMessages = createAsyncThunk(
  'chat/loadMessages',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`);
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }
      const data = await response.json();
      return { sessionId, messages: data as ChatMessage[] };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addLocalMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
      state.currentSessionId = null;
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, action) => {
        state.sending = true;
        state.error = null;
        // Optimistically add user message
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sessionId: action.meta.arg.sessionId,
          content: action.meta.arg.content,
          role: 'user',
          timestamp: new Date().toISOString(),
          attachments: action.meta.arg.attachments,
        };
        state.messages.push(userMessage);
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        state.messages.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload as string;
      })
      .addCase(loadMessages.fulfilled, (state, action) => {
        state.messages = action.payload.messages;
        state.currentSessionId = action.payload.sessionId;
      });
  },
});

export const { addLocalMessage, clearMessages, setCurrentSession, clearError } = chatSlice.actions;

export default chatSlice.reducer;
