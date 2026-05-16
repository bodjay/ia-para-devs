import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../application/store';
import { ChatMessage, receiveMessage, setAwaitingResponse, setChatError } from '../../../application/store/chatSlice';
import { ChatWebSocketClient, WebSocketEvent } from '../../../infrastructure/ws/ChatWebSocketClient';
import ThinkingIndicator from '../chat/ThinkingIndicator';

export interface ChatWindowProps {
  sessionId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { messages, awaitingResponse, error } = useSelector((state: RootState) => state.chat);
  const { status } = useSelector((state: RootState) => state.analysis);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<ChatWebSocketClient | null>(null);

  const isProcessing = status === 'uploading' || status === 'processing';
  const isDisabled = isProcessing || awaitingResponse;

  const handleWebSocketEvent = useCallback(
    (event: WebSocketEvent) => {
      if (event.type === 'user_message' || event.type === 'assistant_message') {
        if (event.messageId && event.content && event.role && event.timestamp) {
          dispatch(
            receiveMessage({
              id: event.messageId,
              sessionId,
              content: event.content,
              role: event.role,
              timestamp: event.timestamp,
            })
          );
        }
      } else if (event.type === 'error') {
        dispatch(setChatError(event.message ?? 'Erro ao processar mensagem'));
      }
    },
    [dispatch, sessionId]
  );

  useEffect(() => {
    wsClientRef.current = new ChatWebSocketClient(sessionId, handleWebSocketEvent);
    return () => {
      wsClientRef.current?.destroy();
      wsClientRef.current = null;
    };
  }, [sessionId, handleWebSocketEvent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, awaitingResponse]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || isDisabled || !wsClientRef.current) return;

    setInputValue('');
    dispatch(setAwaitingResponse(true));
    wsClientRef.current.send(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message: ChatMessage) => (
    <Box
      key={message.id}
      sx={{
        display: 'flex',
        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: '70%',
          p: 1.5,
          borderRadius: 2,
          backgroundColor: message.role === 'user' ? 'primary.main' : 'grey.100',
          color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
        }}
        data-testid={`message-${message.role}`}
      >
        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages area */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        <Box sx={{ maxWidth: 'md', mx: 'auto', px: 2 }}>
          {messages.length === 0 && !isProcessing && (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              mt={4}
              data-testid="empty-chat"
            >
              Nenhuma mensagem ainda. Envie um diagrama para começar.
            </Typography>
          )}

          {messages.map(renderMessage)}

          {(isProcessing || awaitingResponse) && <ThinkingIndicator />}

          <div ref={messagesEndRef} />
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Box sx={{ maxWidth: 'md', mx: 'auto', px: 2, mb: 1 }}>
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        </Box>
      )}

      {/* Input area */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 2 }}>
        <Box sx={{ maxWidth: 'md', mx: 'auto', px: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={awaitingResponse ? 'Aguardando resposta...' : 'Digite sua pergunta...'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            inputProps={{ 'aria-label': 'Mensagem' }}
            size="small"
          />
          <IconButton
            onClick={handleSend}
            disabled={isDisabled || !inputValue.trim()}
            color="primary"
            aria-label="Enviar mensagem"
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatWindow;
