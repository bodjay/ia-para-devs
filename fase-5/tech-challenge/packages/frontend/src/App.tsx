import React from 'react';
import { CssBaseline, ThemeProvider, createTheme, Container } from '@mui/material';
import FileUpload from './presentation/components/FileUpload/FileUpload';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <FileUpload onUpload={() => {}} />
      </Container>
    </ThemeProvider>
  );
}

export default App;
