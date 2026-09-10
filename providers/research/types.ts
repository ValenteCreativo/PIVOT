import type { AnalysisInput, ResearchRound } from '@/lib/types';
export interface ResearchProvider {
  researchHackathon(input: AnalysisInput): Promise<ResearchRound>;
  identifyEvidenceGaps(round: ResearchRound, input: AnalysisInput): Promise<string[]>;
  followUpSearch(gaps: string[], input: AnalysisInput): Promise<ResearchRound>;
}
