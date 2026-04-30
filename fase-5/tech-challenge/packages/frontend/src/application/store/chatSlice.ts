import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MessageRole, MessageAttachment } from '../../domain/entities/Message';
import { bffClient } from '../../infrastructure/api/bffClient';

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
  awaitingResponse: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  currentSessionId: null,
  sending: false,
  awaitingResponse: false,
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
      return await bffClient.sendMessage(payload.sessionId, payload.content, payload.attachments);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const loadMessages = createAsyncThunk(
  'chat/loadMessages',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const messages = await bffClient.getMessages(sessionId);
      return { sessionId, messages };
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
    setAwaitingResponse: (state, action: PayloadAction<boolean>) => {
      state.awaitingResponse = action.payload;
    },
    receiveMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      if (action.payload.role === 'assistant') {
        state.awaitingResponse = false;
      }
    },
    setChatError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.awaitingResponse = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, action) => {
        state.sending = true;
        state.error = null;
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

export const {
  addLocalMessage,
  clearMessages,
  setCurrentSession,
  clearError,
  setAwaitingResponse,
  receiveMessage,
  setChatError,
} = chatSlice.actions;

export default chatSlice.reducer;
