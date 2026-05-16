import React, { useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { AnalysisResult } from '../../../domain/entities/Analysis';

interface DiagramSidebarProps {
  diagramId: string;
  analysisResult?: AnalysisResult | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const SEVERITY_LABEL: Record<string, string> = {
  high: 'alto',
  medium: 'médio',
  low: 'baixo',
};

const PRIORITY_DOT: Record<string, string> = {
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#388e3c',
};

const SectionHeader: React.FC<{
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ open, onToggle, children }) => (
  <Box
    onClick={onToggle}
    sx={{
      px: 1.5,
      py: 0.75,
      display: 'flex',
      alignItems: 'center',
      gap: 0.75,
      cursor: 'pointer',
      flexShrink: 0,
      borderBottom: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      '&:hover': { bgcolor: 'action.hover' },
      userSelect: 'none',
    }}
  >
    <IconButton size="small" sx={{ p: 0.25, flexShrink: 0 }} tabIndex={-1}>
      {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
    </IconButton>
    {children}
  </Box>
);

const DiagramSidebar: React.FC<DiagramSidebarProps> = ({
  diagramId,
  analysisResult,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(true);
  const [reportOpen, setReportOpen] = useState(true);

  const src = `/api/diagrams/${diagramId}/image`;

  const risks = analysisResult?.risks ?? [];
  const firstRisk = risks[0];
  const otherRisksCount = risks.length - 1;

  return (
    <>
      <Box
        sx={{
          width: collapsed ? 48 : 380,
          flexShrink: 0,
          borderLeft: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
        }}
      >
        {collapsed ? (
          <Tooltip title="Expandir painel" placement="left">
            <Box
              onClick={onToggleCollapse}
              sx={{
                height: '100%',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pt: 1.5,
                gap: 0.75,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ChevronLeftIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
              {risks.map((r, i) => (
                <Chip
                  key={i}
                  label={SEVERITY_LABEL[r.severity] ?? r.severity}
                  color={SEVERITY_COLOR[r.severity] ?? 'default'}
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', px: 0 }}
                />
              ))}
            </Box>
          </Tooltip>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Sidebar-level header: only collapse button */}
            <Box
              sx={{
                px: 1,
                py: 0.5,
                display: 'flex',
                justifyContent: 'flex-end',
                borderBottom: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            >
              <Tooltip title="Recolher painel" placement="left">
                <IconButton size="small" onClick={onToggleCollapse}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* ── Section 1: Diagram ─────────────────────────────── */}
            <SectionHeader open={diagramOpen} onToggle={() => setDiagramOpen(v => !v)}>
              <Typography variant="caption" fontWeight="bold" sx={{ flex: 1 }}>
                Diagrama analisado
              </Typography>
              {diagramOpen && (
                <Tooltip title="Expandir imagem">
                  <IconButton
                    size="small"
                    sx={{ p: 0.25, flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); setZoomOpen(true); }}
                  >
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </SectionHeader>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: diagramOpen ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1,
                cursor: 'zoom-in',
                overflow: 'hidden',
              }}
              onClick={() => setZoomOpen(true)}
            >
              <img
                src={src}
                alt="Diagrama de arquitetura"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }}
              />
            </Box>

            {/* ── Section 2: Report ──────────────────────────────── */}
            {analysisResult && (
              <>
                <SectionHeader open={reportOpen} onToggle={() => setReportOpen(v => !v)}>
                  {firstRisk && (
                    <Chip
                      label={SEVERITY_LABEL[firstRisk.severity] ?? firstRisk.severity}
                      color={SEVERITY_COLOR[firstRisk.severity] ?? 'default'}
                      size="small"
                      sx={{ flexShrink: 0, height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                  {otherRisksCount > 0 && (
                    <Chip
                      label={`+${otherRisksCount}`}
                      size="small"
                      variant="outlined"
                      sx={{ flexShrink: 0, height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                  {firstRisk && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      : {firstRisk.description}
                    </Typography>
                  )}
                </SectionHeader>

                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: reportOpen ? 'block' : 'none',
                    overflowY: 'auto',
                    px: 2,
                    py: 1.5,
                  }}
                >
                  {analysisResult.components && analysisResult.components.length > 0 && (
                    <Box mb={1.5}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" gutterBottom>
                        COMPONENTES
                      </Typography>
                      {analysisResult.components.map((c, i) => (
                        <Box key={i} mb={0.25}>
                          <Typography variant="body2" fontWeight="medium" component="span">{c.name}</Typography>
                          <Typography variant="body2" color="text.secondary" component="span"> ({c.type})</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {risks.length > 0 && (
                    <Box mb={1.5}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" gutterBottom>
                        RISCOS
                      </Typography>
                      {risks.map((r, i) => (
                        <Box key={i} display="flex" alignItems="flex-start" gap={0.75} mb={0.5}>
                          <Chip
                            label={SEVERITY_LABEL[r.severity] ?? r.severity}
                            color={SEVERITY_COLOR[r.severity] ?? 'default'}
                            size="small"
                            sx={{ flexShrink: 0, mt: 0.1 }}
                          />
                          <Typography variant="body2">{r.description}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                    <Box mb={1.5}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" gutterBottom>
                        RECOMENDAÇÕES
                      </Typography>
                      {analysisResult.recommendations.map((rec, i) => (
                        <Box key={i} display="flex" alignItems="flex-start" gap={0.75} mb={0.5}>
                          <Box
                            sx={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              bgcolor: PRIORITY_DOT[rec.priority] ?? '#888',
                              mt: 0.8,
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2">{rec.description}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {analysisResult.summary && (
                    <Box mb={0.5}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" gutterBottom>
                        RESUMO
                      </Typography>
                      <Typography variant="body2">{analysisResult.summary}</Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>

      <Dialog
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'grey.900', m: 2 } }}
      >
        <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <IconButton
            onClick={() => setZoomOpen(false)}
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
