import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

const MESSAGES = [
  'Observando o diagrama, percebido um padrão escondido...',
  'Analisando as setas, imaginado o fluxo como um rio curioso.',
  'Conectando os blocos, sentido como se fossem peças de um quebra-cabeça vivo.',
  'Explorando as relações, descoberto um segredo entre os módulos.',
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
    }, 2500);

    return () => clearInterval(fade);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        mb: 1,
      }}
      data-testid="thinking-indicator"
    >
      <Box
        sx={{
          maxWidth: '70%',
          p: 1.5,
          borderRadius: 2,
          backgroundColor: 'grey.100',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'teal',
            fontStyle: 'italic',
          }}
        >
          {MESSAGES[index]}
        </Typography>
      </Box>
    </Box>
  );
};

export default ThinkingIndicator;
