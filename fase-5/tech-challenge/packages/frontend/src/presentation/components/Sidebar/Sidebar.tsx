import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import IosShareIcon from '@mui/icons-material/IosShare';
import { RootState, AppDispatch } from '../../../application/store';
import {
  createSessionAsync,
  renameSessionAsync,
  selectSession,
  searchSessions,
  SessionRecord,
} from '../../../application/store/sessionsSlice';
import { bffClient } from '../../../infrastructure/api/bffClient';

export interface SidebarProps {
  onSessionCreate?: (sessionId: string) => void;
  onSessionSelect?: (sessionId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSessionCreate, onSessionSelect }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { sessions, filteredSessions, currentSessionId, searchTerm } = useSelector(
    (state: RootState) => state.sessions
  );

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [exportText, setExportText] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const displaySessions = searchTerm ? filteredSessions : sessions;

  const sortedSessions = [...displaySessions].sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  );

  const handleNewSession = async () => {
    const count = sessions.length + 1;
    const result = await dispatch(createSessionAsync({ name: `Sessão ${count}` }));
    if (createSessionAsync.fulfilled.match(result) && onSessionCreate) {
      onSessionCreate(result.payload.id);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    dispatch(selectSession(sessionId));
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
  };

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    dispatch(searchSessions(value));
  };

  const startRename = (session: SessionRecord) => {
    setRenamingId(session.id);
    setRenameValue(session.name);
  };

  const commitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await dispatch(renameSessionAsync({ id: renamingId, name: renameValue.trim() }));
    setRenamingId(null);
  };

  const handleExport = async (sessionId: string) => {
    setExportLoading(true);
    try {
      const result = await bffClient.exportSession(sessionId);
      setExportText(result.text);
    } finally {
      setExportLoading(false);
    }
  };

  const handleCopy = () => {
    if (exportText) {
      navigator.clipboard.writeText(exportText);
    }
  };

  return (
    <Box
      role="navigation"
      aria-label="Sessões"
      sx={{ width: 280, display: 'flex', flexDirection: 'column', height: '100%', p: 1 }}
    >
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleNewSession}
        fullWidth
        sx={{ mb: 1 }}
      >
        Nova Sessão
      </Button>

      <TextField
        placeholder="Buscar"
        value={localSearch}
        onChange={(e) => handleSearch(e.target.value)}
        size="small"
        fullWidth
        inputProps={{ 'aria-label': 'Buscar sessões' }}
        sx={{ mb: 1 }}
      />

      {sortedSessions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          Nenhuma sessão encontrada
        </Typography>
      ) : (
        <List dense>
          {sortedSessions.map((session) => (
            <ListItem
              key={session.id}
              disablePadding
              sx={{
                '& .session-actions': { visibility: 'hidden' },
                '&:hover .session-actions': { visibility: 'visible' },
              }}
              secondaryAction={
                <Box className="session-actions" sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Renomear">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(session);
                      }}
                      aria-label={`Renomear ${session.name}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Exportar conversa">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(session.id);
                      }}
                      disabled={exportLoading}
                      aria-label={`Exportar conversa de ${session.name}`}
                    >
                      <IosShareIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemButton
                role="option"
                selected={session.id === currentSessionId}
                onClick={() => handleSelectSession(session.id)}
                aria-current={session.id === currentSessionId ? 'true' : undefined}
                sx={{ pr: 9 }}
              >
                {renamingId === session.id ? (
                  <TextField
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    size="small"
                    autoFocus
                    fullWidth
                    onClick={(e) => e.stopPropagation()}
                    inputProps={{ 'aria-label': 'Novo nome da sessão' }}
                  />
                ) : (
                  <ListItemText
                    primary={session.name}
                    secondary={new Date(session.lastActiveAt).toLocaleDateString('pt-BR')}
                    primaryTypographyProps={{ noWrap: true }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={exportText !== null} onClose={() => setExportText(null)} maxWidth="md" fullWidth>
        <DialogTitle>Exportar conversa para prompt</DialogTitle>
        <DialogContent>
          <TextField
            value={exportText ?? ''}
            multiline
            rows={16}
            fullWidth
            inputProps={{ readOnly: true, 'aria-label': 'Prompt exportado' }}
            sx={{ mt: 1, fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportText(null)}>Fechar</Button>
          <Button variant="contained" onClick={handleCopy}>
            Copiar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sidebar;
