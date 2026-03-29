import { Message } from '../../../src/domain/entities/Message';

describe('Message entity', () => {
  const validSessionId = 'session-id-001';

  describe('creation', () => {
    it('should create a user message', () => {
      const message = new Message({
        sessionId: validSessionId,
        content: 'Quais são os gargalos nesta arquitetura?',
        role: 'user',
      });

      expect(message.sessionId).toBe(validSessionId);
      expect(message.content).toBe('Quais são os gargalos nesta arquitetura?');
      expect(message.role).toBe('user');
      expect(message.id).toBeDefined();
    });

    it('should create an assistant message', () => {
      const message = new Message({
        sessionId: validSessionId,
        content: 'Com base no diagrama, identifiquei os seguintes componentes...',
        role: 'assistant',
      });

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Com base no diagrama, identifiquei os seguintes componentes...');
    });

    it('should throw when content is empty', () => {
      expect(() =>
        new Message({ sessionId: validSessionId, content: '', role: 'user' })
      ).toThrow('content cannot be empty');
    });

    it('should throw when content is only whitespace', () => {
      expect(() =>
        new Message({ sessionId: validSessionId, content: '   ', role: 'user' })
      ).toThrow('content cannot be empty');
    });

    it('should throw when sessionId is empty', () => {
      expect(() =>
        new Message({ sessionId: '', content: 'Some content', role: 'user' })
      ).toThrow('sessionId cannot be empty');
    });

    it('should generate unique id when not provided', () => {
      const msg1 = new Message({ sessionId: validSessionId, content: 'Hello', role: 'user' });
      const msg2 = new Message({ sessionId: validSessionId, content: 'World', role: 'user' });

      expect(msg1.id).toBeDefined();
      expect(msg2.id).toBeDefined();
      expect(msg1.id).not.toBe(msg2.id);
    });

    it('should use provided id', () => {
      const id = 'custom-msg-id-123';
      const message = new Message({
        id,
        sessionId: validSessionId,
        content: 'Test',
        role: 'user',
      });

      expect(message.id).toBe(id);
    });
  });

  describe('timestamp', () => {
    it('should store timestamp as ISO-8601', () => {
      const message = new Message({
        sessionId: validSessionId,
        content: 'Test message',
        role: 'user',
      });

      expect(message.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should use provided timestamp', () => {
      const timestamp = '2024-03-15T14:30:00.000Z';
      const message = new Message({
        sessionId: validSessionId,
        content: 'Test message',
        role: 'user',
        timestamp,
      });

      expect(message.timestamp).toBe(timestamp);
    });

    it('should set current time when timestamp not provided', () => {
      const before = new Date().toISOString();
      const message = new Message({ sessionId: validSessionId, content: 'Test', role: 'user' });
      const after = new Date().toISOString();

      expect(message.timestamp >= before).toBe(true);
      expect(message.timestamp <= after).toBe(true);
    });
  });

  describe('attachments', () => {
    it('should allow attachment (diagram file reference)', () => {
      const attachment = {
        diagramId: 'diagram-001',
        fileName: 'microservices-arch.png',
        fileType: 'image/png',
        previewUrl: 'https://storage.example.com/diagrams/microservices-arch.png',
      };

      const message = new Message({
        sessionId: validSessionId,
        content: 'Analise este diagrama',
        role: 'user',
        attachments: [attachment],
      });

      expect(message.attachments).toHaveLength(1);
      expect(message.attachments[0].diagramId).toBe('diagram-001');
      expect(message.attachments[0].fileName).toBe('microservices-arch.png');
      expect(message.attachments[0].fileType).toBe('image/png');
    });

    it('should not require attachment', () => {
      const message = new Message({
        sessionId: validSessionId,
        content: 'Quais são os riscos?',
        role: 'user',
      });

      expect(message.attachments).toEqual([]);
      expect(message.attachments).toHaveLength(0);
    });

    it('should support multiple attachments', () => {
      const message = new Message({
        sessionId: validSessionId,
        content: 'Compare estes diagramas',
        role: 'user',
        attachments: [
          { diagramId: 'diagram-001', fileName: 'arch-v1.png', fileType: 'image/png' },
          { diagramId: 'diagram-002', fileName: 'arch-v2.png', fileType: 'image/png' },
        ],
      });

      expect(message.attachments).toHaveLength(2);
    });
  });

  describe('serialization', () => {
    it('should convert to plain object', () => {
      const message = new Message({
        sessionId: validSessionId,
        content: 'Test',
        role: 'user',
      });

      const plain = message.toPlainObject();

      expect(plain.id).toBe(message.id);
      expect(plain.sessionId).toBe(validSessionId);
      expect(plain.content).toBe('Test');
      expect(plain.role).toBe('user');
      expect(typeof plain.timestamp).toBe('string');
    });
  });
});
