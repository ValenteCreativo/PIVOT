import { z } from 'zod';

export const analysisInputSchema = z.object({
  hackathonUrl: z.union([z.literal(''), z.string().url()]).optional(),
  idea: z.string().trim().min(12).max(3000),
  teamSize: z.number().int().min(1).max(20).optional(),
  hours: z.number().int().min(4).max(168).optional(),
  strengths: z.string().max(500).optional(),
  goal: z.string().max(100).optional(),
  simulateFailure: z.boolean().optional(),
});

const dimensionSchema = z.object({ key: z.enum(['Problem clarity','User specificity','Novelty','Feasibility','Hackathon scope','Demoability','Sponsor fit','Adoption','Impact','Evidence']), score: z.number().min(0), max: z.number().positive(), note: z.string() });

export const inferenceOutputSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  dimensions: z.array(dimensionSchema).length(10),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  uncertainties: z.array(z.string()),
  pivot: z.string(),
  hardTruth: z.string(),
});

export function parseModelJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw;
  const start = fenced.indexOf('{'); const end = fenced.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('Model response did not contain JSON');
  return inferenceOutputSchema.parse(JSON.parse(fenced.slice(start, end + 1)));
}
