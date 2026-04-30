export interface JobUpdatePayload {
  status: 'processed' | 'failed';
  extractedText?: string;
  elements?: unknown[];
  connections?: unknown[];
  error?: { code: string; message: string };
}

export class ProcessingServiceClient {
  constructor(
    private readonly baseUrl: string = process.env.PROCESSING_SERVICE_URL ?? 'http://localhost:3001'
  ) {}

  async ocr(s3Url: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/tools/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Url }),
    });
    if (!res.ok) throw new Error(`OCR tool failed with status ${res.status}`);
    const data = (await res.json()) as { extractedText: string };
    return data.extractedText;
  }

  async createJob(diagramId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/tools/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagramId }),
    });
    if (!res.ok) throw new Error(`Create job failed with status ${res.status}`);
    const data = (await res.json()) as { jobId: string };
    return data.jobId;
  }

  async updateJob(jobId: string, payload: JobUpdatePayload): Promise<void> {
    const res = await fetch(`${this.baseUrl}/tools/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Update job failed with status ${res.status}`);
  }
}
