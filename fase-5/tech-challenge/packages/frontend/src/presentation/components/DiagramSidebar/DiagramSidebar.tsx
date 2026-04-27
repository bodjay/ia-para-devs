import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

interface DiagramSidebarProps {
  diagramId: string;
}

const DiagramSidebar: React.FC<DiagramSidebarProps> = ({ diagramId }) => {
  const [expanded, setExpanded] = useState(false);

  const src = `/api/diagrams/${diagramId}/image`;

  return (
    <>
      <Box
        sx={{
          width: 300,
          flexShrink: 0,
          borderLeft: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Typography variant="caption" fontWeight="bold" color="text.secondary">
            DIAGRAMA
          </Typography>
          <Tooltip title="Expandir imagem">
            <IconButton size="small" onClick={() => setExpanded(true)}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 1,
            cursor: 'zoom-in',
          }}
          onClick={() => setExpanded(true)}
        >
          <img
            src={src}
            alt="Diagrama de arquitetura"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 4,
            }}
          />
        </Box>
      </Box>

      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'grey.900', m: 2 } }}
      >
        <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <IconButton
            onClick={() => setExpanded(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.4)',
              zIndex: 1,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
          <img
            src={src}
            alt="Diagrama de arquitetura expandido"
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DiagramSidebar;
