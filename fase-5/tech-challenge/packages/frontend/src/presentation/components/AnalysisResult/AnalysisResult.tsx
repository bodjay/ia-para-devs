import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Divider,
  Paper,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { AnalysisResult as AnalysisResultType } from '../../../domain/entities/Analysis';

export interface AnalysisResultProps {
  result: AnalysisResultType | null;
}

const severityIndicatorColor: Record<string, string> = {
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#388e3c',
};

const priorityColor: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const buildDocumentationText = (result: AnalysisResultType): string => {
  const sections: string[] = [];

  sections.push('## Visão Geral');
  sections.push(result.summary || '');

  if (result.components?.length) {
    sections.push('\n## Componentes');
    result.components.forEach((c) => {
      sections.push(`- ${c.name} (${c.type})${c.description ? ': ' + c.description : ''}`);
    });
  }

  if (result.risks?.length) {
    sections.push('\n## Riscos');
    result.risks.forEach((r) => {
      sections.push(`- [${r.severity.toUpperCase()}] ${r.description}`);
    });
  }

  if (result.recommendations?.length) {
    sections.push('\n## Recomendações');
    result.recommendations.forEach((rec) => {
      sections.push(`- [${rec.priority.toUpperCase()}] ${rec.description}`);
    });
  }

  return sections.join('\n');
};

const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
  if (!result) {
    return (
      <Box p={2} data-testid="analysis-empty-state">
        <Typography variant="body2" color="text.secondary">
          Nenhuma análise disponível. Envie um diagrama para começar.
        </Typography>
      </Box>
    );
  }

  const handleCopy = async () => {
    const text = buildDocumentationText(result);
    await navigator.clipboard.writeText(text);
  };

  return (
    <Paper elevation={0} sx={{ p: 2 }} data-testid="analysis-result-container">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Resultado da Análise</Typography>
        <Button
          startIcon={<ContentCopyIcon />}
          size="small"
          onClick={handleCopy}
          aria-label="Copiar documentação"
        >
          Copiar
        </Button>
      </Box>

      {/* Visão Geral */}
      <Box mb={2} data-testid="section-visao-geral">
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Visão Geral
        </Typography>
        <Typography variant="body2">{result.summary}</Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Componentes */}
      {result.components && result.components.length > 0 && (
        <Box mb={2} data-testid="section-componentes">
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Componentes
          </Typography>
          {result.components.map((component, index) => (
            <Box key={index} mb={1}>
              <Typography variant="body2" fontWeight="medium">
                {component.name}
              </Typography>
              <Chip label={component.type} size="small" variant="outlined" sx={{ mr: 1 }} />
              {component.description && (
                <Typography variant="caption" color="text.secondary">
                  {component.description}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Riscos */}
      {result.risks && result.risks.length > 0 && (
        <Box mb={2} data-testid="section-riscos">
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Riscos
          </Typography>
          {result.risks.map((risk, index) => (
            <Box key={index} display="flex" alignItems="flex-start" gap={1} mb={1}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: severityIndicatorColor[risk.severity] || '#ccc',
                  mt: 0.5,
                  flexShrink: 0,
                }}
                data-testid={`risk-indicator-${risk.severity}`}
                aria-label={`Severidade ${risk.severity}`}
              />
              <Box>
                <Typography variant="body2">{risk.description}</Typography>
                <Chip
                  label={risk.severity}
                  size="small"
                  color={
                    risk.severity === 'high'
                      ? 'error'
                      : risk.severity === 'medium'
                      ? 'warning'
                      : 'success'
                  }
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Recomendações */}
      {result.recommendations && result.recommendations.length > 0 && (
        <Box mb={2} data-testid="section-recomendacoes">
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Recomendações
          </Typography>
          {result.recommendations.map((rec, index) => (
            <Box key={index} display="flex" alignItems="flex-start" gap={1} mb={1}>
              <Chip
                label={rec.priority}
                size="small"
                color={priorityColor[rec.priority]}
              />
              <Typography variant="body2">{rec.description}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Padrões */}
      {result.patterns && result.patterns.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box mb={2} data-testid="section-padroes">
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Padrões Identificados
            </Typography>
            {result.patterns.map((pattern, index) => (
              <Typography key={index} variant="body2">
                • {pattern}
              </Typography>
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
};

export default AnalysisResult;
