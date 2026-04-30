import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const MESSAGES = [
  'Observando o diagrama, percebido um padrão escondido...',
  'Analisando as setas, imaginado o fluxo como um rio curioso...',
  'Conectando os blocos, sentido como se fossem peças de um quebra-cabeça vivo...',
  'Explorando as relações, descoberto um segredo entre os módulos...',
  'Percorrendo o diagrama, encontrado caminhos inesperados...',
  'Investigando os nós, revelado um comportamento curioso...',
  'Seguindo as conexões, imaginado um mapa em movimento...',
  'Decifrando os blocos, descoberto um padrão quase invisível...',
  'Explorando os fluxos, sentido uma lógica se formando...',
  'Observando as dependências, percebido um equilíbrio delicado...',
  'Navegando pelo esquema, encontrado atalhos interessantes...',
  'Conectando ideias, criado um desenho cheio de possibilidades...',
  'Analisando camadas, revelado um sistema bem orquestrado...',
  'Percorrendo as linhas, imaginado histórias entre os módulos...',
  'Examinando relações, sentido uma harmonia silenciosa...',
  'Desvendando o fluxo, encontrado um ritmo escondido...',
  'Ligando componentes, percebido um ciclo curioso...',
  'Interpretando o diagrama, criado um cenário quase mágico...',
  'Revisando as conexões, descoberto algo além do óbvio...',
];

const ThinkingIndicator: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fade = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 5000);

    return () => clearInterval(fade);
  }, []);

  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}
      data-testid="thinking-indicator"
    >
      <Box
        sx={{
          maxWidth: '70%',
          p: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        <CircularProgress size={14} />
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          {MESSAGES[index]}
        </Typography>
      </Box>
    </Box>
  );
};

export default ThinkingIndicator;
