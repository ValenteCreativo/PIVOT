import type { AnalysisInput, MentorReport } from '@/lib/types';
import { createResearchProvider } from '@/providers/research';
import { createInferenceProvider } from '@/providers/inference';
import { DemoInferenceProvider } from '@/providers/inference/demo';
import { detectMode } from '@/providers/mode';
import { saveAnalysis } from '@/persistence/analysis-store';

const completed=new Map<string,MentorReport>();
export async function runAnalysis(input:AnalysisInput,idempotencyKey:string){
  const existing=completed.get(idempotencyKey);if(existing)return existing;
  const researchProvider=createResearchProvider();
  const round1=await researchProvider.researchHackathon(input);
  const gaps=await researchProvider.identifyEvidenceGaps(round1,input);round1.gaps=gaps;
  const round2=await researchProvider.followUpSearch(gaps,input);const research=[round1,round2];
  const provider=createInferenceProvider();
  const evaluated=await provider.evaluate(input,research);
  let report:MentorReport;
  if(detectMode()==='demo') report=evaluated as MentorReport;
  else {const baseline=await new DemoInferenceProvider().evaluate(input,research);report={...baseline,...evaluated,analysisId:baseline.analysisId,mode:'live',research};}
  completed.set(idempotencyKey,report);await saveAnalysis(input,report,research);return report;
}
