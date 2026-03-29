import React, { useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from '../../../domain/entities/Diagram';

export interface FileUploadResult {
  file: File;
  previewUrl?: string;
}

export interface FileUploadProps {
  onUpload: (result: FileUploadResult) => void;
  loading?: boolean;
  disabled?: boolean;
}

const ACCEPTED_MIME_TYPES = [...SUPPORTED_FILE_TYPES];
const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.pdf';

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, loading = false, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateAndProcess = (file: File) => {
    setError(null);

    if (!ACCEPTED_MIME_TYPES.includes(file.type as any)) {
      setError('Formato não suportado. Use PNG, JPEG ou PDF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onUpload({ file, previewUrl: undefined });
    } else {
      onUpload({ file });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleClick = () => {
    if (!disabled && !loading) {
      inputRef.current?.click();
    }
  };

  return (
    <Box>
      <Box
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        aria-label="Área de upload de arquivo"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        sx={{
          border: `2px dashed ${dragOver ? '#1976d2' : '#ccc'}`,
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          backgroundColor: dragOver ? 'action.hover' : 'background.paper',
          transition: 'border-color 0.2s, background-color 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-label="Selecionar arquivo"
          data-testid="file-input"
        />

        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <CircularProgress size={40} />
            <Typography variant="body2">Enviando arquivo...</Typography>
          </Box>
        ) : preview ? (
          <Box>
            <img
              src={preview}
              alt="Preview do arquivo"
              style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
            />
            <Typography variant="body2" color="text.secondary" mt={1}>
              Arquivo carregado com sucesso
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="body1">
              Arraste e solte o arquivo aqui ou clique para selecionar
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Formatos suportados: PNG, JPEG, PDF (máx. 10MB)
            </Typography>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }} role="alert">
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload;
