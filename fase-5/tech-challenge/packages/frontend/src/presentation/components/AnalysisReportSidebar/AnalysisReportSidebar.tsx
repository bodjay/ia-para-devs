import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { AnalysisResult } from '../../../domain/entities/Analysis';

interface AnalysisReportSidebarProps {
  analysisResult: AnalysisResult;
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

const AnalysisReportSidebar: React.FC<AnalysisReportSidebarProps> = ({
  analysisResult,
  collapsed = false,
  onToggleCollapse,
}) => (
  <Box
    sx={{
      width: collapsed ? 48 : 300,
      flexShrink: 0,
      borderRight: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.2s ease',
    }}
  >
    {collapsed ? (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Tooltip title="Ver relatório" placement="right">
          <IconButton size="small" onClick={onToggleCollapse}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ) : (
      <>
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
            RELATÓRIO
          </Typography>
          <Tooltip title="Recolher relatório">
            <IconButton size="small" onClick={onToggleCollapse}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
          {analysisResult.components && analysisResult.components.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Componentes
              </Typography>
              {analysisResult.components.map((c, i) => (
                <Box key={i} mb={0.5}>
                  <Typography variant="body2" fontWeight="medium" component="span">{c.name}</Typography>
                  <Typography variant="body2" color="text.secondary" component="span"> ({c.type})</Typography>
                </Box>
              ))}
            </Box>
          )}

          {analysisResult.risks && analysisResult.risks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Riscos
              </Typography>
              {analysisResult.risks.map((r, i) => (
                <Box key={i} display="flex" alignItems="flex-start" gap={1} mb={0.75}>
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
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Recomendações
              </Typography>
              {analysisResult.recommendations.map((rec, i) => (
                <Box key={i} display="flex" alignItems="flex-start" gap={1} mb={0.75}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: PRIORITY_DOT[rec.priority] ?? '#888',
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
            <Box mb={1}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Resumo
              </Typography>
              <Typography variant="body2">{analysisResult.summary}</Typography>
            </Box>
          )}
        </Box>
      </>
    )}
  </Box>
);

export default AnalysisReportSidebar;
