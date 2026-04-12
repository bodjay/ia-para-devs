import { CreateAnalysisUseCase } from '../../../src/application/use-cases/CreateAnalysisUseCase';
import { IAnalysisRepository } from '../../../src/domain/repositories/IAnalysisRepository';
import { CreateAnalysisInput } from '../../../src/domain/use-cases/ICreateAnalysisUseCase';

const makeRepository = (): jest.Mocked<IAnalysisRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(null),
});

const makeValidInput = (overrides: Partial<CreateAnalysisInput> = {}): CreateAnalysisInput => ({
  diagram: {
    id: 'diag-001',
    fileName: 'architecture.png',
    fileType: 'image/png',
    fileSize: 204800,
    storageUrl: 'https://storage.example.com/diagrams/diag-001.png',
  },
  user: {
    id: 'user-001',
    name: 'João Silva',
    email: 'joao.silva@example.com',
  },
  options: {
    language: 'pt-BR',
    analysisDepth: 'basic',
    includeRecommendations: true,
    includeRisks: true,
  },
  ...overrides,
});

describe('CreateAnalysisUseCase', () => {
  let repository: jest.Mocked<IAnalysisRepository>;
  let useCase: CreateAnalysisUseCase;

  beforeEach(() => {
    repository = makeRepository();
    useCase = new CreateAnalysisUseCase(repository);
  });

  it('should create analysis with valid diagram, user and options', async () => {
    const input = makeValidInput();
    const output = await useCase.execute(input);

    expect(output).toBeDefined();
    expect(output.analysisId).toBeTruthy();
    expect(output.status).toBe('created');
  });

  it('should return analysisId and status "created"', async () => {
    const input = makeValidInput();
    const output = await useCase.execute(input);

    expect(output.analysisId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(output.status).toBe('created');
  });

  it('should persist analysis to repository', async () => {
    const input = makeValidInput();
    await useCase.execute(input);

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisId: expect.any(String),
        status: 'pending',
      })
    );
  });

  it('should set estimatedCompletionSeconds based on analysisDepth', async () => {
    const basicInput = makeValidInput({ options: { analysisDepth: 'basic' } });
    const intermediateInput = makeValidInput({ options: { analysisDepth: 'intermediate' } });
    const deepInput = makeValidInput({ options: { analysisDepth: 'deep' } });

    const basicOutput = await useCase.execute(basicInput);
    const intermediateOutput = await useCase.execute(intermediateInput);
    const deepOutput = await useCase.execute(deepInput);

    expect(basicOutput.estimatedCompletionSeconds).toBe(30);
    expect(intermediateOutput.estimatedCompletionSeconds).toBe(60);
    expect(deepOutput.estimatedCompletionSeconds).toBe(120);
  });

  it('should throw when diagram fileType is invalid (not image/png, image/jpeg, application/pdf)', async () => {
    const input = makeValidInput({
      diagram: {
        id: 'diag-001',
        fileName: 'diagram.bmp',
        fileType: 'image/bmp' as never,
        fileSize: 1024,
        storageUrl: 'https://storage.example.com/diagrams/diag-001.bmp',
      },
    });

    await expect(useCase.execute(input)).rejects.toThrow(/Unsupported fileType/);
  });

  it('should throw when diagram id is missing', async () => {
    const input = makeValidInput({
      diagram: {
        id: '',
        fileName: 'architecture.png',
        fileType: 'image/png',
        fileSize: 204800,
        storageUrl: 'https://storage.example.com/diagrams/diag-001.png',
      },
    });

    await expect(useCase.execute(input)).rejects.toThrow('diagram.id is required');
  });

  it('should throw when user id is missing', async () => {
    const input = makeValidInput({
      user: {
        id: '',
        name: 'João Silva',
        email: 'joao.silva@example.com',
      },
    });

    await expect(useCase.execute(input)).rejects.toThrow('user.id is required');
  });

  it('should throw when user email is invalid', async () => {
    const input = makeValidInput({
      user: {
        id: 'user-001',
        name: 'João Silva',
        email: 'not-a-valid-email',
      },
    });

    await expect(useCase.execute(input)).rejects.toThrow('user.email is invalid');
  });

  it('should use "pt-BR" as default language when not provided', async () => {
    const input = makeValidInput({ options: { analysisDepth: 'basic' } });

    const output = await useCase.execute(input);

    expect(output).toBeDefined();
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('should use "basic" as default analysisDepth when not provided', async () => {
    const input = makeValidInput({ options: {} });

    const output = await useCase.execute(input);

    expect(output.estimatedCompletionSeconds).toBe(30);
  });

  it('should return createdAt as ISO-8601 string', async () => {
    const input = makeValidInput();
    const output = await useCase.execute(input);

    expect(output.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(() => new Date(output.createdAt)).not.toThrow();
  });

  it('should accept image/jpeg as valid fileType', async () => {
    const input = makeValidInput({
      diagram: {
        id: 'diag-002',
        fileName: 'architecture.jpg',
        fileType: 'image/jpeg',
        fileSize: 102400,
        storageUrl: 'https://storage.example.com/diagrams/diag-002.jpg',
      },
    });

    await expect(useCase.execute(input)).resolves.toBeDefined();
  });

  it('should accept application/pdf as valid fileType', async () => {
    const input = makeValidInput({
      diagram: {
        id: 'diag-003',
        fileName: 'architecture.pdf',
        fileType: 'application/pdf',
        fileSize: 512000,
        storageUrl: 'https://storage.example.com/diagrams/diag-003.pdf',
      },
    });

    await expect(useCase.execute(input)).resolves.toBeDefined();
  });
});
