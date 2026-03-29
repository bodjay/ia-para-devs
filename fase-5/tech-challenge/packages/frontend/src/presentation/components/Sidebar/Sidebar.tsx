import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { RootState, AppDispatch } from '../../../application/store';
import {
  createSession,
  selectSession,
  searchSessions,
  SessionRecord,
} from '../../../application/store/sessionsSlice';

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

  const displaySessions = searchTerm ? filteredSessions : sessions;

  const sortedSessions = [...displaySessions].sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  );

  const handleNewSession = () => {
    const id = crypto.randomUUID();
    const count = sessions.length + 1;
    dispatch(createSession({ name: `Sessão ${count}`, id }));
    if (onSessionCreate) {
      onSessionCreate(id);
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
            <ListItemButton
              key={session.id}
              role="option"
              selected={session.id === currentSessionId}
              onClick={() => handleSelectSession(session.id)}
              aria-current={session.id === currentSessionId ? 'true' : undefined}
            >
              <ListItemText
                primary={session.name}
                secondary={new Date(session.lastActiveAt).toLocaleDateString('pt-BR')}
                primaryTypographyProps={{ noWrap: true }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
};

export default Sidebar;
