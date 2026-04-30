import React, { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { AnalysisResult } from '../../../domain/entities/Analysis';

interface AnalysisReportBarProps {
  analysisResult: AnalysisResult;
}

const SEVERITY_LABEL: Record<string, string> = {
  high: 'alto',
  medium: 'médio',
  low: 'baixo',
};

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const PRIORITY_DOT: Record<string, string> = {
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#388e3c',
};

export const COLLAPSED_BAR_HEIGHT = 44;

const AnalysisReportBar: React.FC<AnalysisReportBarProps> = ({ analysisResult }) => {
  const [expanded, setExpanded] = useState(false);

  const riskCounts = { high: 0, medium: 0, low: 0 };
  analysisResult.risks?.forEach((r) => {
    if (r.severity in riskCounts) riskCounts[r.severity as keyof typeof riskCounts]++;
  });

  const firstRecommendation = analysisResult.recommendations?.[0]?.description ?? '';

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      {/* Collapsed bar — always visible */}
      <Box
        sx={{
          height: COLLAPSED_BAR_HEIGHT,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {/* Risk badges */}
        {(Object.entries(riskCounts) as [string, number][])
          .filter(([, count]) => count > 0)
          .map(([severity, count]) => (
            <Chip
              key={severity}
              label={`${count} ${SEVERITY_LABEL[severity]}`}
              color={SEVERITY_COLOR[severity]}
              size="small"
              sx={{ flexShrink: 0 }}
            />
          ))}

        {firstRecommendation && (
          <>
            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
              ·
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ flex: 1, minWidth: 0 }}
            >
              {firstRecommendation}
            </Typography>
          </>
        )}

        <Tooltip title={expanded ? 'Fechar relatório' : 'Ver relatório completo'}>
          <IconButton size="small" onClick={() => setExpanded((v) => !v)} sx={{ ml: 'auto', flexShrink: 0 }}>
            {expanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Expanded content — overlays chat with elevation */}
      <Collapse in={expanded} unmountOnExit>
        <Paper
          elevation={8}
          square
          sx={{
            maxHeight: '55vh',
            overflowY: 'auto',
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Components */}
          {analysisResult.components && analysisResult.components.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
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

          {/* Risks */}
          {analysisResult.risks && analysisResult.risks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Riscos
              </Typography>
              {analysisResult.risks.map((r, i) => (
                <Box key={i} display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Chip label={r.severity} color={SEVERITY_COLOR[r.severity]} size="small" />
                  <Typography variant="body2">{r.description}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Recommendations */}
          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Recomendações
              </Typography>
              {analysisResult.recommendations.map((rec, i) => (
                <Box key={i} display="flex" alignItems="flex-start" gap={1} mb={0.5}>
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

          {/* Summary */}
          {analysisResult.summary && (
            <Box mb={1}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Resumo
              </Typography>
              <Typography variant="body2">{analysisResult.summary}</Typography>
            </Box>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AnalysisReportBar;
