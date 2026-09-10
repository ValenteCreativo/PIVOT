import { env } from 'cloudflare:workers';
import type { AnalysisInput, MentorReport, ResearchRound } from '@/lib/types';

let ready=false;
async function init(){if(ready)return;const db=env.DB;if(!db)return;await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS analyses (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, mode TEXT NOT NULL, input_json TEXT NOT NULL, report_json TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, analysis_id TEXT NOT NULL, round_number INTEGER NOT NULL, finding_json TEXT NOT NULL)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_findings_analysis_round ON findings(analysis_id, round_number)`),
]);ready=true;}
export async function saveAnalysis(input:AnalysisInput,report:MentorReport,rounds:ResearchRound[]){
  try{await init();if(!env.DB)return;const statements=[env.DB.prepare(`INSERT INTO analyses (id,created_at,mode,input_json,report_json) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET report_json=excluded.report_json`).bind(report.analysisId,report.createdAt,report.mode,JSON.stringify(input),JSON.stringify(report))];
    for(const round of rounds)for(const finding of round.findings)statements.push(env.DB.prepare(`INSERT INTO findings (id,analysis_id,round_number,finding_json) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET finding_json=excluded.finding_json`).bind(`${report.analysisId}:${finding.id}`,report.analysisId,round.round,JSON.stringify(finding)));
    await env.DB.batch(statements);
  }catch(error){console.warn('Persistence unavailable; analysis remains retrievable in the current response.',error);}
}
