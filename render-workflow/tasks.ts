import { task } from '@renderinc/sdk/workflows';
import { analysisInputSchema } from '../lib/schemas';
import type { AnalysisInput, MentorReport, ResearchRound } from '../lib/types';
import { createResearchProvider } from '../providers/research/index';
import { createInferenceProvider } from '../providers/inference/index';
import { DemoInferenceProvider } from '../providers/inference/demo';
import { detectMode } from '../providers/mode';

type RunEnvelope={analysisId:string;idempotencyKey:string;input:AnalysisInput};
const retry={maxRetries:3,waitDurationMs:1000,backoffScaling:2};

export const parseInput=task({name:'parse_input',retry},async(_ctx,payload:RunEnvelope)=>({...payload,input:analysisInputSchema.parse(payload.input)}));
export const researchHackathon=task({name:'research_hackathon',retry},async(_ctx,payload:RunEnvelope)=>({payload,round1:await createResearchProvider().researchHackathon(payload.input)}));
export const identifyGaps=task({name:'identify_gaps',retry},async(_ctx,state:{payload:RunEnvelope;round1:ResearchRound})=>{const gaps=await createResearchProvider().identifyEvidenceGaps(state.round1,state.payload.input);return{...state,round1:{...state.round1,gaps},gaps};});
export const followupResearch=task({name:'followup_research',retry},async(_ctx,state:{payload:RunEnvelope;round1:ResearchRound;gaps:string[]})=>({...state,round2:await createResearchProvider().followUpSearch(state.gaps,state.payload.input)}));
export const evaluateIdea=task({name:'evaluate_with_nebius',retry,timeoutSeconds:600},async(_ctx,state:{payload:RunEnvelope;round1:ResearchRound;round2:ResearchRound})=>{const research=[state.round1,state.round2];const evaluated=await createInferenceProvider().evaluate(state.payload.input,research);if(detectMode()==='demo')return evaluated as MentorReport;const base=await new DemoInferenceProvider().evaluate(state.payload.input,research);return{...base,...evaluated,analysisId:state.payload.analysisId,mode:'live' as const,research};});
export const generatePivot=task({name:'generate_pivot',retry},async(_ctx,report:MentorReport)=>({...report,workflowValidated:true}));
export const persistReport=task({name:'persist_report',retry},async(_ctx,report:MentorReport & {workflowValidated:boolean})=>({report,status:'complete',persistKey:report.analysisId}));

export const runAnalysisWorkflow=task({name:'run_analysis',retry,timeoutSeconds:1200},async(ctx,input:AnalysisInput,idempotencyKey:string)=>{
  const payload=await ctx.run(parseInput,{analysisId:crypto.randomUUID(),idempotencyKey,input});
  const researched=await ctx.run(researchHackathon,payload);
  const withGaps=await ctx.run(identifyGaps,researched);
  const followed=await ctx.run(followupResearch,withGaps);
  const evaluated=await ctx.run(evaluateIdea,followed);
  const pivoted=await ctx.run(generatePivot,evaluated);
  return ctx.run(persistReport,pivoted);
});
