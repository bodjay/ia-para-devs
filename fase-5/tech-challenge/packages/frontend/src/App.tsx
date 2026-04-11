import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Collapse,
  CssBaseline,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';
import Sidebar from './presentation/components/Sidebar/Sidebar';
import ChatWindow from './presentation/components/ChatWindow/ChatWindow';
import FileUpload from './presentation/components/FileUpload/FileUpload';
import { FileUploadResult } from './presentation/components/FileUpload/FileUpload';
import { RootState, AppDispatch } from './application/store';
import { loadLastActiveSession } from './application/store/sessionsSlice';
import { loadMessages } from './application/store/chatSlice';
import { uploadAndAnalyzeDiagram, resetAnalysis } from './application/store/analysisSlice';

const theme = createTheme({
  palette: { mode: 'light' },
});

function AppContent(): React.ReactElement {
  const dispatch = useDispatch<AppDispatch>();

  const currentSessionId = useSelector(
    (state: RootState) => state.sessions.currentSessionId
  );
  const { status, result } = useSelector((state: RootState) => state.analysis);

  const isUploading = status === 'uploading' || status === 'processing';
  const showUpload = status === 'idle';

  // Load sessions on mount, select the most recently active
  useEffect(() => {
    dispatch(loadLastActiveSession());
  }, [dispatch]);

  // When session changes, reload messages and reset analysis state
  useEffect(() => {
    if (currentSessionId) {
      dispatch(resetAnalysis());
      dispatch(loadMessages(currentSessionId));
    }
  }, [currentSessionId, dispatch]);

  const handleUpload = ({ file }: FileUploadResult) => {
    if (!currentSessionId) return;
    dispatch(uploadAndAnalyzeDiagram({ file, sessionId: currentSessionId }));
  };

  const handleSessionSelect = (sessionId: string) => {
    dispatch(loadMessages(sessionId));
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <Box
        sx={{
          width: 280,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
            ARCH ANALYZER
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <Sidebar onSessionSelect={handleSessionSelect} />
        </Box>
      </Box>

      {/* ── Main area ───────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Typography variant="h6" fontWeight="medium">
            {currentSessionId ? 'Análise de Arquitetura' : 'Selecione uma sessão'}
          </Typography>
        </Box>

        {currentSessionId ? (
          <>
            {/* Upload area — visible only when idle */}
            <Collapse in={showUpload} unmountOnExit>
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              >
                <FileUpload
                  onUpload={handleUpload}
                  loading={isUploading}
                  disabled={isUploading}
                />
              </Box>
            </Collapse>

            {/* Chat window — fills remaining height */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <ChatWindow sessionId={currentSessionId} analysisResult={result} />
            </Box>
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1,
              color: 'text.secondary',
            }}
          >
            <Typography variant="body1">
              Crie ou selecione uma sessão para começar
            </Typography>
            <Typography variant="caption">
              Use o painel à esquerda para gerenciar suas sessões
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
