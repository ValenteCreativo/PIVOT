import type { MentorModelAssessment } from './schemas';
import { dualScores, nearMissFor, normalizeScore, verdictFor, WEIGHTS } from './scoring';
import type { AnalysisInput, DimensionScore, MentorReport, ResearchRound } from './types';

const systemOnlyPatterns=[/\bpivot!?\b/i,/\blinkup\b/i,/\bnebius\b/i,/\brender workflows?\b/i,/pull the lever/i,/research rounds?/i,/ten[- ]dimension verdict/i];
function corpus(input:AnalysisInput,research:ResearchRound[]){return [input.idea,input.hackathonUrl??'',...research.flatMap(round=>round.findings.flatMap(f=>[f.title,f.summary,f.claimSupported]))].join(' ').toLowerCase();}
function contaminated(text:string,targetCorpus:string){return systemOnlyPatterns.some(pattern=>pattern.test(text)&&!pattern.test(targetCorpus));}
function cleanText(value:string,targetCorpus:string,fallback:string){return contaminated(value,targetCorpus)?fallback:value;}
function cleanList(items:string[],targetCorpus:string,fallback:string[]){const clean=items.filter(item=>!contaminated(item,targetCorpus));return clean.length?clean:fallback;}
function canonicalDimensions(assessment:MentorModelAssessment):DimensionScore[]{return assessment.dimensions.map(d=>{const max=WEIGHTS[d.key];return{...d,max,score:Math.max(0,Math.min(d.score,max))};});}
function sponsorFit(assessment:MentorModelAssessment,research:ResearchRound[]){const evidence=research.flatMap(r=>r.findings).filter(f=>!f.demo&&f.relationship==='Target event · first-party').map(f=>`${f.title} ${f.summary} ${f.claimSupported}`).join(' ').toLowerCase();const nameIsVerified=(name:string)=>{if(name.length<3)return false;if(evidence.includes(name.toLowerCase()))return true;const names=name.toLowerCase().split(/\s*(?:\/|,|&|\+|\band\b)\s*/).map(value=>value.trim()).filter(value=>value.length>=3);return names.length>1&&names.every(value=>evidence.includes(value));};const verified=assessment.sponsorFit.filter(s=>s.fit==='UNKNOWN'||nameIsVerified(s.name));const named=verified.filter(s=>s.fit!=='UNKNOWN');return named.length?named:[{name:'Hackathon sponsors',fit:'UNKNOWN' as const,reason:'Sponsor and track information could not be verified from the available target-hackathon evidence.'}];}

export function buildLiveMentorReport(input:AnalysisInput,research:ResearchRound[],assessment:MentorModelAssessment,analysisId=crypto.randomUUID()):MentorReport{
  const targetCorpus=corpus(input,research),dimensions=canonicalDimensions(assessment),score=normalizeScore(dimensions),edges=dualScores(dimensions),evidence=dimensions.find(d=>d.key==='Evidence')!;
  const evidenceCoverage=Math.round(evidence.score/evidence.max*100),verdict=verdictFor(score),near=nearMissFor(score,verdict);
  const idea=`the submitted ${input.idea.slice(0,120)}${input.idea.length>120?'…':''} project`;
  const report:MentorReport={analysisId,mode:'live',createdAt:new Date().toISOString(),originalIdea:input.idea,score,...edges,confidence:assessment.confidence,evidenceCoverage,risk:score>=80&&assessment.confidence>=70?'LOW':score>=55?'MEDIUM':'HIGH',verdict,summary:assessment.summary,dimensions,
    strengths:assessment.strengths,weaknesses:assessment.weaknesses,uncertainties:assessment.uncertainties,research,novelty:assessment.novelty,
    adoption:{
      user:cleanText(assessment.adoption.user,targetCorpus,'The narrowly defined user of the submitted project'),
      payer:cleanText(assessment.adoption.payer,targetCorpus,'The person or organization receiving the target-project outcome'),
      why:cleanText(assessment.adoption.why,targetCorpus,`They adopt ${idea} only if its core outcome is meaningfully better than their current workflow.`),
      first100:cleanText(assessment.adoption.first100,targetCorpus,`Recruit the first users directly from the target audience for ${idea} and validate one repeated use case.`),
    },
    feasibility:cleanList(assessment.feasibility,targetCorpus,[`Build one end-to-end proof of ${idea} using the team's most familiar tools.`]),sponsorFit:sponsorFit(assessment,research),pivot:assessment.pivot,
    mvp:cleanList(assessment.mvp,targetCorpus,[`One end-to-end primary workflow for ${idea}`,'One clear user input','One visible output that demonstrates the core value','Basic failure handling']).slice(0,5),
    doNotBuild:cleanList(assessment.doNotBuild,targetCorpus,[`Secondary workflows beyond the core promise of ${idea}`,'Authentication, billing, or collaboration unless essential to the demo']),
    stack:cleanList(assessment.stack,targetCorpus,["The team's fastest familiar application stack",'Only APIs required by the core target-project workflow','Minimal persistence for demo-critical state']),
    plan:assessment.plan.filter(p=>!contaminated(p.milestone,targetCorpus)),demoPlan:assessment.demoPlan.filter(p=>!contaminated(p.beat,targetCorpus)),hardTruth:assessment.hardTruth,nextValidation:assessment.nextValidation};
  if(!report.plan.length)report.plan=[{time:'0–4h',milestone:`Define the target user and core outcome for ${idea}.`},{time:'4–14h',milestone:'Build the single end-to-end user workflow.'},{time:'14–20h',milestone:'Test with representative inputs and fix the critical failure path.'},{time:'20–24h',milestone:'Polish and rehearse the target project demo.'}];
  if(!report.demoPlan.length)report.demoPlan=[{time:'0–10s',beat:'Show the target user and problem.'},{time:'10–20s',beat:'Provide the project input.'},{time:'20–40s',beat:'Demonstrate the core target-project interaction.'},{time:'40–55s',beat:'Reveal the measurable outcome.'},{time:'55–60s',beat:'Explain why the result matters to the target user.'}];
  if(near)report.nearMiss={...near,moves:assessment.weaknesses.slice(0,3).map((action,index)=>({action,impact:Math.max(1,near.points-index)}))};
  assertScoringInvariants(report);return report;
}

export function assertScoringInvariants(report:MentorReport){const score=normalizeScore(report.dimensions),edges=dualScores(report.dimensions),verdict=verdictFor(score),near=nearMissFor(score,verdict);if(report.score!==score)throw new Error(`Score invariant failed: expected ${score}, received ${report.score}`);if(report.hackathonEdge!==edges.hackathonEdge||report.realWorldEdge!==edges.realWorldEdge)throw new Error('Edge score invariant failed');if(report.verdict!==verdict)throw new Error(`Verdict invariant failed: expected ${verdict}, received ${report.verdict}`);if(Boolean(report.nearMiss)!==Boolean(near)||near&&(report.nearMiss?.nextVerdict!==near.nextVerdict||report.nearMiss.points!==near.points))throw new Error('Near-miss invariant failed');}
