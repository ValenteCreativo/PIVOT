import type { DimensionScore, Verdict } from './types';

export const WEIGHTS: Record<DimensionScore['key'], number> = {
  'Problem clarity': 10, 'User specificity': 8, Novelty: 12, Feasibility: 12,
  'Hackathon scope': 12, Demoability: 10, 'Sponsor fit': 10, Adoption: 10, Impact: 8, Evidence: 8,
};

export function normalizeScore(dimensions: DimensionScore[]) {
  return Math.round(dimensions.reduce((sum, d) => sum + Math.max(0, Math.min(d.score, d.max)), 0));
}

export function verdictFor(score: number): Verdict {
  if (score >= 80) return 'ALL IN';
  if (score >= 60) return 'DOUBLE DOWN';
  if (score >= 40) return 'PIVOT';
  return 'FOLD';
}

const thresholds: { score: number; verdict: Verdict }[] = [{score:40,verdict:'PIVOT'},{score:60,verdict:'DOUBLE DOWN'},{score:80,verdict:'ALL IN'}];
export function nearMissFor(score: number, verdict: Verdict) {
  const next = thresholds.find(t => t.score > score && t.score - score <= 5);
  return next && next.verdict !== verdict ? { nextVerdict: next.verdict, points: next.score - score } : undefined;
}

export function dualScores(dimensions: DimensionScore[]) {
  const score = (keys: DimensionScore['key'][]) => Math.round(dimensions.filter(d=>keys.includes(d.key)).reduce((s,d)=>s + d.score/d.max*100,0)/keys.length);
  return {
    hackathonEdge: score(['Novelty','Feasibility','Hackathon scope','Demoability','Sponsor fit']),
    realWorldEdge: score(['Problem clarity','User specificity','Feasibility','Adoption','Impact','Evidence']),
  };
}
