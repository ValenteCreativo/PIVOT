import type { MentorModelAssessment } from '@/lib/schemas';
import type { AnalysisInput, MentorReport, ResearchRound } from '@/lib/types';
export interface MentorInferenceProvider { evaluate(input:AnalysisInput,research:ResearchRound[]):Promise<MentorModelAssessment|MentorReport>; }
