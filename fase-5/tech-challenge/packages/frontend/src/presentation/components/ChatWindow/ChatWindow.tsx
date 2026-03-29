import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../application/store';
import { sendMessage } from '../../../application/store/chatSlice';
import { ChatMessage } from '../../../application/store/chatSlice';
import { AnalysisResult } from '../../../domain/entities/Analysis';

export interface ChatWindowProps {
  sessionId: string;
  analysisResult?: AnalysisResult | null;
}

const severityColor: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const priorityColor: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId, analysisResult }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { messages, sending, error } = useSelector((state: RootState) => state.chat);
  const { status } = useSelector((state: RootState) => state.analysis);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isProcessing = status === 'uploading' || status === 'processing';
  const isResponding = status === 'responding' || sending;
  const isDisabled = isProcessing || isResponding;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || isDisabled) return;

    setInputValue('');
    dispatch(sendMessage({ sessionId, content }));
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
        mb: 1,
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
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
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

        {isProcessing && (
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            mt={1}
            data-testid="processing-indicator"
          >
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Analisando diagrama...
            </Typography>
          </Box>
        )}

        {isResponding && !isProcessing && (
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            mt={1}
            data-testid="typing-indicator"
          >
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Assistente está digitando...
            </Typography>
          </Box>
        )}

        {/* Analysis result display */}
        {analysisResult && (
          <Box mt={2} data-testid="analysis-result">
            {analysisResult.components && analysisResult.components.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Componentes identificados
                </Typography>
                {analysisResult.components.map((c, i) => (
                  <Box key={i} display="flex" alignItems="center" gap={0.5} mb={0.5}>
                    <Typography variant="body2" fontWeight="medium">{c.name}</Typography>
                    <Typography variant="body2" color="text.secondary">({c.type})</Typography>
                  </Box>
                ))}
              </Box>
            )}

            {analysisResult.risks && analysisResult.risks.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Riscos
                </Typography>
                {analysisResult.risks.map((r, i) => (
                  <Box key={i} display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Chip
                      label={r.severity}
                      color={severityColor[r.severity]}
                      size="small"
                    />
                    <Typography variant="body2">{r.description}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Recomendações
                </Typography>
                {analysisResult.recommendations.map((rec, i) => (
                  <Box key={i} display="flex" alignItems="flex-start" gap={1} mb={0.5}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: priorityColor[rec.priority] === 'error' ? '#d32f2f' : priorityColor[rec.priority] === 'warning' ? '#f57c00' : '#388e3c',
                        mt: 0.75,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2">{rec.description}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            {analysisResult.summary && (
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Resumo
                </Typography>
                <Typography variant="body2">{analysisResult.summary}</Typography>
              </Box>
            )}
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }} role="alert">
          {error}
        </Alert>
      )}

      {/* Input area */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Digite sua pergunta..."
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
  );
};

export default ChatWindow;
