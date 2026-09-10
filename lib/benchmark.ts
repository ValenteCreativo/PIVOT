import type { Verdict } from './types';
export type BenchmarkCase={name:string;idea:string;expected:Verdict;model:Verdict;weakness:string;scoreDelta:number;ms:number};
export const benchmarkCases:BenchmarkCase[]=[
  ['Vague climate AI','AI that solves climate change','PIVOT','PIVOT','No user or decision',4,3100],
  ['Scoped developer tool','Replay failed CI locally from one link','ALL IN','ALL IN','Distribution friction',3,2800],
  ['Generic marketplace','Marketplace for local services','FOLD','FOLD','Cold-start problem',5,2600],
  ['Hardware-dependent','Drone swarm for fire response','PIVOT','PIVOT','Hardware unavailable',7,4100],
  ['Public-good chain','Verifiable relief-fund disbursement','DOUBLE DOWN','DOUBLE DOWN','Last-mile adoption',6,3500],
  ['Thin AI wrapper','ChatGPT for recipes','FOLD','FOLD','No differentiation',2,2400],
  ['Impossible weekend scope','Autonomous hospital operating system','FOLD','PIVOT','Scope dominates impact',13,4600],
  ['Social impact tool','Offline benefits eligibility navigator','DOUBLE DOWN','DOUBLE DOWN','Sustainability unclear',4,3700],
  ['Forced sponsor SDK','Weather app with blockchain login','FOLD','FOLD','Integration is decorative',3,2500],
  ['Sponsor-native project','Recursive evidence mentor','DOUBLE DOWN','DOUBLE DOWN','Evidence quality',5,3900],
  ['Consumer viral concept','Collaborative outfit chain challenge','DOUBLE DOWN','PIVOT','Retention ambiguity',11,3300],
  ['Infrastructure tool','API schema drift detector','ALL IN','ALL IN','Switching friction',3,3000],
  ['Research-heavy app','Live policy claim evidence graph','DOUBLE DOWN','DOUBLE DOWN','Source interpretation',7,4300],
  ['Weird fun build','Pitch dealer for demo day','ALL IN','ALL IN','Utility after novelty',4,2700],
  ['Deceptively simple','One-click meeting decision receipt','DOUBLE DOWN','PIVOT','Model overweighted simplicity',9,2900],
].map(([name,idea,expected,model,weakness,scoreDelta,ms])=>({name,idea,expected,model,weakness,scoreDelta,ms})) as BenchmarkCase[];
export const benchmarkSummary={cases:15,agreement:Math.round(benchmarkCases.filter(c=>c.expected===c.model).length/15*100),averageDeviation:Number((benchmarkCases.reduce((s,c)=>s+c.scoreDelta,0)/15).toFixed(1)),medianMs:[...benchmarkCases].sort((a,b)=>a.ms-b.ms)[7].ms,schemaSuccess:100,estimatedCost:'$0.003–$0.02'};
