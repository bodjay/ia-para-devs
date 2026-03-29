import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FileUpload, { FileUploadResult } from '../../../src/presentation/components/FileUpload/FileUpload';
import { MAX_FILE_SIZE_BYTES } from '../../../src/domain/entities/Diagram';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-preview-url');
global.URL.revokeObjectURL = jest.fn();

const createFile = (
  name: string,
  type: string,
  size: number = 1024 * 1024
): File => {
  const file = new File(['x'.repeat(Math.min(size, 100))], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const renderFileUpload = (props: Partial<React.ComponentProps<typeof FileUpload>> = {}) => {
  const onUpload = jest.fn();
  const result = render(<FileUpload onUpload={onUpload} {...props} />);
  return { ...result, onUpload };
};

describe('FileUpload component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render upload area with drag-and-drop instructions', () => {
      renderFileUpload();

      expect(screen.getByText(/arraste e solte/i)).toBeInTheDocument();
      expect(screen.getByText(/clique para selecionar/i)).toBeInTheDocument();
    });

    it('should display supported formats hint', () => {
      renderFileUpload();

      expect(screen.getByText(/PNG, JPEG, PDF/i)).toBeInTheDocument();
    });
  });

  describe('file selection via click', () => {
    it('should accept PNG file on click upload', async () => {
      const { onUpload } = renderFileUpload();
      const file = createFile('diagram.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      expect(onUpload).toHaveBeenCalledTimes(1);
      const result: FileUploadResult = onUpload.mock.calls[0][0];
      expect(result.file.name).toBe('diagram.png');
      expect(result.file.type).toBe('image/png');
    });

    it('should accept JPEG file on click upload', async () => {
      const { onUpload } = renderFileUpload();
      const file = createFile('architecture.jpg', 'image/jpeg');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      expect(onUpload).toHaveBeenCalledTimes(1);
      expect(onUpload.mock.calls[0][0].file.type).toBe('image/jpeg');
    });

    it('should accept PDF file on click upload', async () => {
      const { onUpload } = renderFileUpload();
      const file = createFile('architecture-doc.pdf', 'application/pdf');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      expect(onUpload).toHaveBeenCalledTimes(1);
      expect(onUpload.mock.calls[0][0].file.type).toBe('application/pdf');
    });
  });

  describe('validation errors', () => {
    it('should show error message for unsupported file type (e.g. .txt)', async () => {
      const { onUpload } = renderFileUpload();
      const file = createFile('notes.txt', 'text/plain');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(onUpload).not.toHaveBeenCalled();
    });

    it('should show "Formato não suportado" for invalid file type', async () => {
      renderFileUpload();
      const file = createFile('data.csv', 'text/csv');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      expect(await screen.findByText(/formato não suportado/i)).toBeInTheDocument();
    });

    it('should show error message when file exceeds size limit', async () => {
      const { onUpload } = renderFileUpload();
      const oversizedFile = createFile('huge-diagram.png', 'image/png', MAX_FILE_SIZE_BYTES + 1);
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, oversizedFile);

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(onUpload).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading state while uploading', () => {
      renderFileUpload({ loading: true });

      expect(screen.getByText(/enviando arquivo/i)).toBeInTheDocument();
      // Check for progress indicator
      expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });
  });

  describe('file preview', () => {
    it('should display file preview after successful upload of image', async () => {
      renderFileUpload();
      const file = createFile('microservices.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      expect(await screen.findByAltText(/preview do arquivo/i)).toBeInTheDocument();
    });
  });

  describe('callback', () => {
    it('should call onUpload callback with file data on success', async () => {
      const { onUpload } = renderFileUpload();
      const file = createFile('arch-diagram.png', 'image/png', 2 * 1024 * 1024);
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      expect(onUpload).toHaveBeenCalledTimes(1);
      const callArg: FileUploadResult = onUpload.mock.calls[0][0];
      expect(callArg.file).toBe(file);
    });
  });

  describe('drag and drop', () => {
    it('should allow drag and drop of valid file', async () => {
      const { onUpload } = renderFileUpload();
      const file = createFile('drag-drop.png', 'image/png');
      const dropZone = screen.getByRole('button', { name: /área de upload/i });

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [file] },
      });

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalledTimes(1);
      });
    });

    it('should show error state on drag of invalid file type', async () => {
      const { onUpload } = renderFileUpload();
      const file = createFile('script.js', 'application/javascript');
      const dropZone = screen.getByRole('button', { name: /área de upload/i });

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(onUpload).not.toHaveBeenCalled();
    });
  });
});
