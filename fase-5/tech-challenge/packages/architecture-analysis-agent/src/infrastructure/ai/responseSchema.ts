import { z } from 'zod';

const ComponentSchema = z.object({
  name: z.string().min(1, 'component name cannot be empty'),
  type: z.string().default('unknown'),
  description: z.string().default(''),
  observations: z.string().optional().default(''),
});

const PatternSchema = z.object({
  name: z.string().min(1, 'pattern name cannot be empty'),
  confidence: z.number().min(0).max(1).default(0.5),
  description: z.string().default(''),
});

const RiskSchema = z.object({
  title: z.string().min(1, 'risk title cannot be empty'),
  description: z.string().min(1, 'risk description cannot be empty'),
  severity: z.enum(['low', 'medium', 'high']),
  affectedComponents: z.array(z.string()).default([]),
});

const RecommendationSchema = z.object({
  title: z.string().min(1, 'recommendation title cannot be empty'),
  description: z.string().min(1, 'recommendation description cannot be empty'),
  priority: z.enum(['low', 'medium', 'high']),
  relatedRisks: z.array(z.string()).default([]),
});

export const AnalysisResponseSchema = z.object({
  components: z.array(ComponentSchema).default([]),
  architecturePatterns: z.array(PatternSchema).default([]),
  risks: z.array(RiskSchema).default([]),
  recommendations: z.array(RecommendationSchema).default([]),
  summary: z.string().min(1, 'summary cannot be empty'),
});

export type ValidatedAnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
