export type Verdict = 'FOLD' | 'PIVOT' | 'DOUBLE DOWN' | 'ALL IN';

export type AnalysisInput = {
  hackathonUrl?: string;
  idea: string;
  teamSize?: number;
  hours?: number;
  strengths?: string;
  goal?: string;
  simulateFailure?: boolean;
};

export type DimensionKey = 'Problem clarity' | 'User specificity' | 'Novelty' | 'Feasibility' | 'Hackathon scope' | 'Demoability' | 'Sponsor fit' | 'Adoption' | 'Impact' | 'Evidence';
export type DimensionScore = { key: DimensionKey; score: number; max: number; note: string };
export type ResearchFinding = { id: string; title: string; url: string; retrievedAt: string; query: string; summary: string; claimSupported: string; confidence: number; relationship: string; demo: boolean };
export type ResearchRound = { round: number; focus: string; queries: string[]; findings: ResearchFinding[]; gaps: string[] };

export type MentorReport = {
  analysisId: string;
  mode: 'demo' | 'live';
  createdAt: string;
  originalIdea: string;
  score: number;
  hackathonEdge: number;
  realWorldEdge: number;
  confidence: number;
  evidenceCoverage: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  verdict: Verdict;
  summary: string;
  dimensions: DimensionScore[];
  strengths: string[];
  weaknesses: string[];
  uncertainties: string[];
  research: ResearchRound[];
  novelty: { direct: string[]; adjacent: string[]; wedge: string; judgment: string };
  adoption: { user: string; payer: string; why: string; first100: string };
  feasibility: string[];
  sponsorFit: { name: string; fit: 'NATURAL' | 'POSSIBLE' | 'FORCED'; reason: string }[];
  pivot: string;
  mvp: string[];
  doNotBuild: string[];
  stack: string[];
  plan: { time: string; milestone: string }[];
  demoPlan: { time: string; beat: string }[];
  hardTruth: string;
  nextValidation: string[];
  nearMiss?: { nextVerdict: Verdict; points: number; moves: { action: string; impact: number }[] };
};

export type StepState = 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'recovered';
export type WorkflowStep = { id: string; label: string; state: StepState; attempt?: number; detail?: string };
