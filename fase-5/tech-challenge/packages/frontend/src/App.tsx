import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Collapse,
  CssBaseline,
  IconButton,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Sidebar from './presentation/components/Sidebar/Sidebar';
import ChatWindow from './presentation/components/ChatWindow/ChatWindow';
import FileUpload from './presentation/components/FileUpload/FileUpload';
import DiagramSidebar from './presentation/components/DiagramSidebar/DiagramSidebar';
import { FileUploadResult } from './presentation/components/FileUpload/FileUpload';
import { RootState, AppDispatch } from './application/store';
import { loadLastActiveSession } from './application/store/sessionsSlice';
import { loadMessages } from './application/store/chatSlice';
import { uploadAndAnalyzeDiagram, resetAnalysis, loadAnalysis } from './application/store/analysisSlice';

const theme = createTheme({
  palette: { mode: 'light' },
});

function AppContent(): React.ReactElement {
  const dispatch = useDispatch<AppDispatch>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [diagramCollapsed, setDiagramCollapsed] = useState(false);

  const currentSessionId = useSelector(
    (state: RootState) => state.sessions.currentSessionId
  );
  const { status, result } = useSelector((state: RootState) => state.analysis);
  const sessions = useSelector((state: RootState) => state.sessions.sessions);
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const diagramId = useSelector((state: RootState) => state.analysis.diagramId);

  const isUploading = status === 'uploading' || status === 'processing';
  const showUpload = status === 'idle' && !currentSession?.diagramId;

  // Load sessions on mount, select the most recently active
  useEffect(() => {
    dispatch(loadLastActiveSession());
  }, [dispatch]);

  // When session changes, reload messages and restore analysis if session has one
  useEffect(() => {
    if (!currentSessionId) return;
    dispatch(resetAnalysis());
    dispatch(loadMessages(currentSessionId));
    const session = sessions.find((s) => s.id === currentSessionId);
    if (session?.analysisId) {
      dispatch(loadAnalysis(session.analysisId));
    }
  }, [currentSessionId, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

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
          width: sidebarCollapsed ? 48 : 280,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
        }}
      >
        {sidebarCollapsed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Tooltip title="Expandir sessões" placement="right">
              <IconButton size="small" onClick={() => setSidebarCollapsed(false)}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                ARCH ANALYZER
              </Typography>
              <Tooltip title="Recolher sessões" placement="right">
                <IconButton size="small" onClick={() => setSidebarCollapsed(true)}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Sidebar onSessionSelect={handleSessionSelect} />
            </Box>
          </>
        )}
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
            {currentSessionId ? (currentSession?.name ?? 'Análise de Arquitetura') : 'Selecione uma sessão'}
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

            {/* Chat + diagram sidebar */}
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <ChatWindow sessionId={currentSessionId} />
              </Box>
              {status === 'completed' && diagramId && (
                <DiagramSidebar
                  diagramId={diagramId}
                  analysisResult={result}
                  collapsed={diagramCollapsed}
                  onToggleCollapse={() => setDiagramCollapsed(prev => !prev)}
                />
              )}
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
