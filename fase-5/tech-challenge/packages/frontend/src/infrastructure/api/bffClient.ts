import { AnalysisResult } from '../../domain/entities/Analysis';
import { MessageAttachment } from '../../domain/entities/Message';
import { SessionRecord } from '../../application/store/sessionsSlice';
import { ChatMessage } from '../../application/store/chatSlice';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((body as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ─── Diagrams ────────────────────────────────────────────────────────────────

export async function uploadDiagram(
  file: File,
  sessionId: string
): Promise<{ diagramId: string; analysisId: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('sessionId', sessionId);

  const res = await fetch(`${BASE}/diagrams/upload`, { method: 'POST', body: form });
  return handleResponse(res);
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

interface AnalysisResponse {
  analysisId: string;
  status: string;
  result?: AnalysisResult;
  error?: { message: string };
}

async function fetchAnalysis(analysisId: string): Promise<AnalysisResponse> {
  const res = await fetch(`${BASE}/analysis/${analysisId}`);
  return handleResponse<AnalysisResponse>(res);
}

export async function pollAnalysis(
  analysisId: string,
  opts: { intervalMs?: number; maxAttempts?: number } = {}
): Promise<AnalysisResult> {
  const intervalMs = opts.intervalMs ?? 2000;
  const maxAttempts = opts.maxAttempts ?? 30;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await fetchAnalysis(analysisId);

    if (data.status === 'completed' && data.result) {
      return data.result;
    }

    if (data.status === 'failed') {
      throw new Error(data.error?.message ?? 'Analysis failed');
    }

    if (attempt < maxAttempts - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error('Analysis timed out after maximum polling attempts');
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<SessionRecord[]> {
  const res = await fetch(`${BASE}/sessions`);
  const data = await handleResponse<
    { id: string; name: string; createdAt: string; lastActiveAt: string; diagramId?: string }[]
  >(res);
  return data.map((s) => ({
    id: s.id,
    name: s.name,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    diagramId: s.diagramId,
  }));
}

export async function createSession(name: string, id?: string): Promise<SessionRecord> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, id }),
  });
  const data = await handleResponse<{
    id: string;
    name: string;
    createdAt: string;
    lastActiveAt: string;
  }>(res);
  return {
    id: data.id,
    name: data.name,
    createdAt: data.createdAt,
    lastActiveAt: data.lastActiveAt,
  };
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/messages`);
  const data = await handleResponse<
    { id: string; sessionId: string; content: string; role: string; timestamp: string }[]
  >(res);
  return data.map((m) => ({
    id: m.id,
    sessionId: m.sessionId,
    content: m.content,
    role: m.role as ChatMessage['role'],
    timestamp: m.timestamp,
  }));
}

export async function sendMessage(
  sessionId: string,
  content: string,
  attachments?: MessageAttachment[]
): Promise<ChatMessage> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, attachments }),
  });
  const data = await handleResponse<{
    id: string;
    sessionId: string;
    content: string;
    role: string;
    timestamp: string;
    attachments?: MessageAttachment[];
  }>(res);
  return {
    id: data.id,
    sessionId: data.sessionId,
    content: data.content,
    role: data.role as ChatMessage['role'],
    timestamp: data.timestamp,
    attachments: data.attachments,
  };
}

// Agrupado para importação conveniente
export const bffClient = {
  uploadDiagram,
  pollAnalysis,
  getSessions,
  createSession,
  getMessages,
  sendMessage,
};
