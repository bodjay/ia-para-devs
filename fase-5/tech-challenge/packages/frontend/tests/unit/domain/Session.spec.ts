import { Session } from '../../../src/domain/entities/Session';
import { Message } from '../../../src/domain/entities/Message';

describe('Session entity', () => {
  const validId = 'test-session-id-001';
  const validName = 'Sessão 1';

  describe('creation', () => {
    it('should create a Session with valid id and name', () => {
      const session = new Session({ id: validId, name: validName });

      expect(session.id).toBe(validId);
      expect(session.name).toBe(validName);
    });

    it('should initialize with empty messages', () => {
      const session = new Session({ id: validId, name: validName });

      expect(session.messages).toHaveLength(0);
    });

    it('should generate id when not provided', () => {
      const session = new Session({ name: validName });

      expect(session.id).toBeDefined();
      expect(session.id).not.toBe('');
      expect(typeof session.id).toBe('string');
    });

    it('should throw when name is empty', () => {
      expect(() => new Session({ name: '' })).toThrow('Session name cannot be empty');
    });

    it('should throw when name is only whitespace', () => {
      expect(() => new Session({ name: '   ' })).toThrow('Session name cannot be empty');
    });

    it('should trim whitespace from name', () => {
      const session = new Session({ name: '  Sessão 1  ' });
      expect(session.name).toBe('Sessão 1');
    });
  });

  describe('timestamps', () => {
    it('should set createdAt as ISO-8601 string when not provided', () => {
      const before = new Date().toISOString();
      const session = new Session({ name: validName });
      const after = new Date().toISOString();

      expect(session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(session.createdAt >= before).toBe(true);
      expect(session.createdAt <= after).toBe(true);
    });

    it('should use provided createdAt', () => {
      const createdAt = '2024-01-15T10:00:00.000Z';
      const session = new Session({ name: validName, createdAt });

      expect(session.createdAt).toBe(createdAt);
    });

    it('should update lastActiveAt when message is added', async () => {
      const session = new Session({ id: validId, name: validName });
      const initialLastActive = session.lastActiveAt;

      // Small delay to ensure timestamps differ
      await new Promise((resolve) => setTimeout(resolve, 5));

      session.addMessage({
        sessionId: validId,
        content: 'Test message',
        role: 'user',
      });

      expect(session.lastActiveAt > initialLastActive).toBe(true);
    });
  });

  describe('messages', () => {
    it('should store multiple messages in order', () => {
      const session = new Session({ id: validId, name: validName });

      session.addMessage({ sessionId: validId, content: 'First message', role: 'user' });
      session.addMessage({ sessionId: validId, content: 'Second message', role: 'assistant' });
      session.addMessage({ sessionId: validId, content: 'Third message', role: 'user' });

      expect(session.messages).toHaveLength(3);
      expect(session.messages[0].content).toBe('First message');
      expect(session.messages[1].content).toBe('Second message');
      expect(session.messages[2].content).toBe('Third message');
    });

    it('should return immutable copy of messages array', () => {
      const session = new Session({ id: validId, name: validName });
      session.addMessage({ sessionId: validId, content: 'First message', role: 'user' });

      const messages = session.messages;
      messages.push({} as Message); // Attempt to mutate

      expect(session.messages).toHaveLength(1);
    });

    it('should initialize with provided messages', () => {
      const session = new Session({
        id: validId,
        name: validName,
        messages: [
          { sessionId: validId, content: 'Pre-existing message', role: 'user' },
          { sessionId: validId, content: 'Pre-existing response', role: 'assistant' },
        ],
      });

      expect(session.messages).toHaveLength(2);
    });
  });

  describe('serialization', () => {
    it('should convert to plain object', () => {
      const session = new Session({ id: validId, name: validName });
      session.addMessage({ sessionId: validId, content: 'Hello', role: 'user' });

      const plain = session.toPlainObject();

      expect(plain.id).toBe(validId);
      expect(plain.name).toBe(validName);
      expect(plain.messages).toHaveLength(1);
      expect(Array.isArray(plain.messages)).toBe(true);
    });

    it('should include diagramId in plain object when set', () => {
      const session = new Session({ id: validId, name: validName, diagramId: 'diagram-001' });
      const plain = session.toPlainObject();

      expect(plain.diagramId).toBe('diagram-001');
    });
  });
});
