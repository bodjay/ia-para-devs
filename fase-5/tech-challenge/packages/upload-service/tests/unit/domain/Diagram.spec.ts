import { Diagram, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from '../../../src/domain/entities/Diagram';

describe('Diagram Entity', () => {
  const validProps = {
    fileName: 'architecture-diagram.png',
    fileType: 'image/png',
    fileSize: 1024 * 512, // 512KB
    storageUrl: 'https://storage.example.com/diagrams/architecture-diagram.png',
    userId: 'user-123',
  };

  describe('should create a Diagram with valid data', () => {
    it('creates successfully with all required fields', () => {
      const diagram = new Diagram(validProps);

      expect(diagram.fileName).toBe('architecture-diagram.png');
      expect(diagram.fileType).toBe('image/png');
      expect(diagram.fileSize).toBe(1024 * 512);
      expect(diagram.storageUrl).toBe('https://storage.example.com/diagrams/architecture-diagram.png');
      expect(diagram.userId).toBe('user-123');
    });
  });

  describe('should throw when fileName is empty', () => {
    it('throws when fileName is an empty string', () => {
      expect(() => new Diagram({ ...validProps, fileName: '' })).toThrow('fileName cannot be empty');
    });

    it('throws when fileName is only whitespace', () => {
      expect(() => new Diagram({ ...validProps, fileName: '   ' })).toThrow('fileName cannot be empty');
    });
  });

  describe('should throw when fileType is unsupported', () => {
    it('throws for text/plain MIME type', () => {
      expect(() => new Diagram({ ...validProps, fileType: 'text/plain' })).toThrow(
        'Unsupported file type: text/plain'
      );
    });

    it('throws for application/zip MIME type', () => {
      expect(() => new Diagram({ ...validProps, fileType: 'application/zip' })).toThrow(
        'Unsupported file type: application/zip'
      );
    });

    it('throws for image/gif MIME type', () => {
      expect(() => new Diagram({ ...validProps, fileType: 'image/gif' })).toThrow(
        'Unsupported file type: image/gif'
      );
    });

    it('accepts image/png as supported type', () => {
      expect(() => new Diagram({ ...validProps, fileType: 'image/png' })).not.toThrow();
    });

    it('accepts image/jpeg as supported type', () => {
      expect(() => new Diagram({ ...validProps, fileType: 'image/jpeg' })).not.toThrow();
    });

    it('accepts application/pdf as supported type', () => {
      expect(() => new Diagram({ ...validProps, fileType: 'application/pdf' })).not.toThrow();
    });
  });

  describe('should throw when fileSize is zero or negative', () => {
    it('throws when fileSize is zero', () => {
      expect(() => new Diagram({ ...validProps, fileSize: 0 })).toThrow(
        'fileSize must be greater than zero'
      );
    });

    it('throws when fileSize is negative', () => {
      expect(() => new Diagram({ ...validProps, fileSize: -100 })).toThrow(
        'fileSize must be greater than zero'
      );
    });
  });

  describe('should generate a unique id if none provided', () => {
    it('generates an id when not provided', () => {
      const diagram = new Diagram(validProps);

      expect(diagram.id).toBeDefined();
      expect(typeof diagram.id).toBe('string');
      expect(diagram.id.length).toBeGreaterThan(0);
    });

    it('generates unique ids for different instances', () => {
      const diagram1 = new Diagram(validProps);
      const diagram2 = new Diagram(validProps);

      expect(diagram1.id).not.toBe(diagram2.id);
    });

    it('uses provided id when given', () => {
      const diagram = new Diagram({ ...validProps, id: 'custom-id-123' });

      expect(diagram.id).toBe('custom-id-123');
    });
  });

  describe('should set uploadedAt to current time when not provided', () => {
    it('sets uploadedAt to a Date close to now', () => {
      const before = new Date();
      const diagram = new Diagram(validProps);
      const after = new Date();

      expect(diagram.uploadedAt).toBeInstanceOf(Date);
      expect(diagram.uploadedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(diagram.uploadedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('uses provided uploadedAt when given', () => {
      const specificDate = new Date('2024-01-15T10:30:00.000Z');
      const diagram = new Diagram({ ...validProps, uploadedAt: specificDate });

      expect(diagram.uploadedAt).toEqual(specificDate);
    });
  });

  describe('SUPPORTED_FILE_TYPES', () => {
    it('includes image/png, image/jpeg, and application/pdf', () => {
      expect(SUPPORTED_FILE_TYPES).toContain('image/png');
      expect(SUPPORTED_FILE_TYPES).toContain('image/jpeg');
      expect(SUPPORTED_FILE_TYPES).toContain('application/pdf');
    });
  });

  describe('MAX_FILE_SIZE_BYTES', () => {
    it('is 10MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });
  });
});
