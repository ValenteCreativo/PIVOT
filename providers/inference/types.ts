import type { AnalysisInput, MentorReport, ResearchRound } from '@/lib/types';
export interface MentorInferenceProvider { evaluate(input:AnalysisInput,research:ResearchRound[]):Promise<Partial<MentorReport>>; }
