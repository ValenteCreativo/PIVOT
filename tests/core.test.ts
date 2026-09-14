import { afterEach,describe,expect,it,vi } from 'vitest';
import { buildLiveMentorReport, assertScoringInvariants } from '@/lib/report-builder';
import { nearMissFor, normalizeScore, verdictFor, WEIGHTS } from '@/lib/scoring';
import { analysisInputSchema, CANONICAL_DIMENSION_KEYS, mentorInferenceJsonSchema, parseModelJson, type MentorModelAssessment } from '@/lib/schemas';
import type { MentorReport, ResearchRound } from '@/lib/types';
import { detectMode } from '@/providers/mode';
import { DemoResearchProvider } from '@/providers/research/demo';
import { LinkupResearchProvider } from '@/providers/research/linkup';
import { canonicalizeEventUrl, classifyEvidence, humanizeSlug } from '@/lib/event-url';
import { IdempotencyCache, withRetry } from '@/workflows/retry';
import { CHILD_TASK_RETRY, INFERENCE_TASK_RETRY, ORCHESTRATOR_RETRY } from '@/workflows/retry-policy';
import { NebiusInferenceProvider } from '@/providers/inference/nebius';
import { runConfiguredAnalysis } from '@/workflows';
import { runRenderWorkflow } from '@/workflows/render';
import { workflowOrdinal } from '@/lib/workflow-progress';
import { analysisIdFor } from '@/lib/idempotency';

function assessment(overrides:Partial<MentorModelAssessment>={}):MentorModelAssessment {
  return {
    confidence:75,summary:'A focused team ritual with a visible outcome.',
    dimensions:CANONICAL_DIMENSION_KEYS.map(key=>({key,score:Math.round(WEIGHTS[key]*.7),max:WEIGHTS[key],note:`Target-project judgment for ${key}`})),
    strengths:['The shared finish is visually demonstrable.'],weaknesses:['Repeat use is not yet proven.'],uncertainties:['No direct user interviews.'],
    novelty:{direct:['Virtual coworking rooms'],adjacent:['Team timers'],wedge:'A shared completion race',judgment:'The workflow combination is differentiated.'},
    adoption:{user:'Remote product teams',payer:'Team leads',why:'It turns a stalled task into a shared commitment.',first100:'Recruit remote teams from product communities.'},
    feasibility:['Build a synchronized room and task state.'],sponsorFit:[{name:'Hackathon sponsors',fit:'UNKNOWN',reason:'Sponsor evidence was unavailable.'}],
    pivot:'A 25-minute focus sprint with one committed task per teammate.',mvp:['Create a room','Commit one task','Run a shared timer','Show completion'],
    doNotBuild:['A full project-management suite'],stack:['TypeScript web app','Realtime room state','Lightweight persistence'],
    plan:[{time:'0–6h',milestone:'Build room creation and task commitments.'}],demoPlan:[{time:'0–60s',beat:'Run one team sprint and show the shared completion.'}],
    hardTruth:'A timer alone will not retain teams.',nextValidation:['Run five facilitated team sessions.'],...overrides,
  };
}

const emptyResearch:ResearchRound[]=[{round:1,focus:'hackathon',queries:['tracks'],findings:[],gaps:['Sponsor details unavailable']}];
const focusInput={idea:'A multiplayer focus room where remote teams race to finish one task together.'};
const mentorReport=()=>buildLiveMentorReport(focusInput,emptyResearch,assessment());

afterEach(()=>vi.restoreAllMocks());

describe('mentor scoring',()=>{
  it('normalizes and clamps dimension scores',()=>expect(normalizeScore([{key:'Evidence',score:12,max:8,note:''}])).toBe(8));
  it('uses deterministic score-only verdict boundaries',()=>{expect(verdictFor(79)).toBe('DOUBLE DOWN');expect(verdictFor(80)).toBe('ALL IN');expect(verdictFor(59)).toBe('PIVOT')});
  it('calculates constructive near misses',()=>expect(nearMissFor(77,'DOUBLE DOWN')).toEqual({nextVerdict:'ALL IN',points:3}));
  it('derives score, edges, verdict, and near miss from canonical dimensions',()=>{
    const dimensions=assessment().dimensions.map(d=>({...d,score:d.max*.79}));
    const report=buildLiveMentorReport({idea:'A multiplayer focus room where remote teams race to finish one task together.'},emptyResearch,assessment({dimensions}));
    expect(report.score).toBe(79);expect(report.verdict).toBe('DOUBLE DOWN');expect(report.nearMiss).toMatchObject({nextVerdict:'ALL IN',points:1});expect(()=>assertScoringInvariants(report)).not.toThrow();
  });
  it('rejects the exact contradictory live-run scoring combination',()=>{
    const report=buildLiveMentorReport({idea:'A multiplayer focus room where remote teams race to finish one task together.'},emptyResearch,assessment()) as MentorReport;
    const inconsistent={...report,score:47,hackathonEdge:82,realWorldEdge:77,verdict:'DOUBLE DOWN' as const,nearMiss:{nextVerdict:'ALL IN' as const,points:1,moves:[]}};
    expect(()=>assertScoringInvariants(inconsistent)).toThrow(/invariant failed/);
  });
});

describe('target-project isolation',()=>{
  it('removes the exact PIVOT implementation contamination and preserves strong project analysis',()=>{
    const contaminated=assessment({
      summary:'Remote teams can make one shared task completion visible.',hardTruth:'Without completion proof this is only a timer.',pivot:'Require one task commitment and visible completion proof.',
      dimensions:assessment().dimensions.map(d=>({...d,note:`Strong analysis of the focus-room project: ${d.key}`})),
      adoption:{user:'Remote product teams',payer:'Team leads',why:'They need a focused team ritual.',first100:'Pull the lever for hackathon teams and show research rounds.'},
      feasibility:['Use Nebius structured inference and Render Workflow retries.'],
      sponsorFit:[{name:'Linkup',fit:'NATURAL',reason:'PIVOT uses it for research.'},{name:'Nebius',fit:'NATURAL',reason:'PIVOT uses it for inference.'},{name:'Render',fit:'NATURAL',reason:'PIVOT uses its workflow.'}],
      mvp:['Two-pass evidence research','Structured ten-dimension verdict'],stack:['Linkup search adapter','Nebius structured inference','Render Workflow orchestration'],
      doNotBuild:['Do not change the PIVOT casino UI'],plan:[{time:'0–8h',milestone:'Build the PIVOT research rounds.'}],demoPlan:[{time:'0–60s',beat:'Pull the lever and reveal the verdict.'}],
    });
    const report=buildLiveMentorReport({idea:'A multiplayer focus room where remote teams race to finish one task together.',hackathonUrl:'https://example.com/hackathon'},emptyResearch,contaminated);
    const ancillary=JSON.stringify({adoption:report.adoption,feasibility:report.feasibility,sponsorFit:report.sponsorFit,mvp:report.mvp,stack:report.stack,doNotBuild:report.doNotBuild,plan:report.plan,demoPlan:report.demoPlan});
    expect(ancillary).not.toMatch(/PIVOT|Linkup|Nebius|Render Workflow|pull the lever|research rounds|ten-dimension/i);
    expect(report.sponsorFit).toEqual([{name:'Hackathon sponsors',fit:'UNKNOWN',reason:'Sponsor and track information could not be verified from the available target-hackathon evidence.'}]);
    expect(report.originalIdea).toBe('A multiplayer focus room where remote teams race to finish one task together.');
    expect(report.summary).toBe(contaminated.summary);expect(report.hardTruth).toBe(contaminated.hardTruth);expect(report.pivot).toBe(contaminated.pivot);expect(report.dimensions[0].note).toBe(contaminated.dimensions[0].note);
  });
});

describe('providers and schemas',()=>{
  it('detects explicit and automatic modes',()=>{expect(detectMode({APP_MODE:'demo'})).toBe('demo');expect(detectMode({LINKUP_API_KEY:'x',NEBIUS_API_KEY:'y'})).toBe('live')});
  it('rejects underspecified input',()=>expect(()=>analysisInputSchema.parse({idea:'tiny'})).toThrow());
  it('parses fenced structured model output',()=>expect(parseModelJson('```json\n'+JSON.stringify(assessment())+'\n```').summary).toContain('focused'));
  it('normalizes malformed GLM labels and explanatory fields from the Render run',()=>{
    const keys=['problem clarity','User-Specificity','NOVELTY','Real-world feasibility','Hackathon Scope (12 pts)','Demo Ability','Sponsor / Track Fit','Business & Adoption Model','Impact / Utility','Evidence Quality'];
    const dimensions=keys.map((key,index)=>index===9?{key,score:5,max:8}:{key,score:5,max:index===1||index===8?8:index===2||index===3||index===4?12:10,rationale:`Why ${key} scored this way`});
    const parsed=parseModelJson(JSON.stringify(assessment({dimensions:dimensions as MentorModelAssessment['dimensions']})));
    expect(parsed.dimensions.map(d=>d.key)).toEqual([...CANONICAL_DIMENSION_KEYS]);expect(parsed.dimensions[0].note).toBe('Why problem clarity scored this way');expect(parsed.dimensions[9].note).toBe('Scored 5 of 8; the model supplied no additional explanation.');
  });
  it('rejects unknown or ambiguous dimension labels',()=>{const value=assessment();value.dimensions[3]={...value.dimensions[3],key:'Technical magic' as never};expect(()=>parseModelJson(JSON.stringify(value))).toThrow('Unknown mentor dimension label')});
  it('requires canonical dimension fields and every target-project section',()=>{expect(mentorInferenceJsonSchema.schema.properties.dimensions.items.required).toEqual(['key','score','max','note']);expect(mentorInferenceJsonSchema.schema.required).toContain('demoPlan');expect(mentorInferenceJsonSchema.schema.required).not.toContain('score')});
  it('requests strict JSON Schema from the environment-selected Nebius model',async()=>{
    const content=JSON.stringify(assessment());const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
    await new NebiusInferenceProvider('secret-not-for-logs','zai-org/GLM-5.3-Flash').evaluate({idea:'A sufficiently detailed test idea'},[]);
    const request=JSON.parse(String(fetchMock.mock.calls[0][1]?.body));expect(request.model).toBe('zai-org/GLM-5.3-Flash');expect(request.max_completion_tokens).toBe(12000);expect(request.reasoning_effort).toBe('low');expect(request.response_format.type).toBe('json_schema');expect(request.response_format.json_schema.strict).toBe(true);
  });
  it('fails fast when GLM spends the response on reasoning and returns no JSON content',async()=>{
    const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'chatcmpl-length',choices:[{finish_reason:'length',message:{content:'',reasoning_content:'Internal draft that is not the final evaluation.',tool_calls:null}}],usage:{completion_tokens:8192,completion_tokens_details:{reasoning_tokens:8192}}}),{status:200,headers:{'Content-Type':'application/json'}}));
    const errorLog=vi.spyOn(console,'error').mockImplementation(()=>undefined);
    await expect(new NebiusInferenceProvider('never-log-this-key','zai-org/GLM-5.3-Flash',undefined,{fetchImpl,wait:async()=>undefined}).evaluate({idea:'A sufficiently detailed test idea'},[])).rejects.toThrow('Model response did not contain JSON');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const logged=JSON.stringify(errorLog.mock.calls);expect(logged).toContain('chatcmpl-length');expect(logged).toContain('length');expect(logged).toContain('reasoningLength');expect(logged).not.toContain('never-log-this-key');
  });
  it('retries transient Nebius failures but not structured-output validation failures',async()=>{
    const fetchImpl=vi.fn().mockResolvedValueOnce(new Response('temporarily unavailable',{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(assessment())}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
    vi.spyOn(console,'warn').mockImplementation(()=>undefined);
    const result=await new NebiusInferenceProvider('secret','zai-org/GLM-5.3-Flash',undefined,{fetchImpl,wait:async()=>undefined}).evaluate({idea:'A sufficiently detailed test idea'},[]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);expect(result.summary).toContain('focused');
  });
  it('logs raw model output on validation failure without logging the API key',async()=>{
    const value=assessment();value.dimensions[0]={...value.dimensions[0],key:'Unrecognized dimension' as never};const content=JSON.stringify(value);
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'Content-Type':'application/json'}}));const errorLog=vi.spyOn(console,'error').mockImplementation(()=>undefined);
    await expect(new NebiusInferenceProvider('never-log-this-key','model-from-env').evaluate({idea:'A sufficiently detailed test idea'},[])).rejects.toThrow('Unknown mentor dimension label');const logged=JSON.stringify(errorLog.mock.calls);expect(logged).toContain('Unrecognized dimension');expect(logged).not.toContain('never-log-this-key');
  });
  it('derives follow-up queries from Round 1 gaps',async()=>{const p=new DemoResearchProvider();const input={idea:'AI climate app'};const one=await p.researchHackathon(input);const gaps=await p.identifyEvidenceGaps(one,input);const two=await p.followUpSearch(gaps,input);expect(two.queries[0]).toContain(gaps[0]);expect(two.round).toBe(2)});
  it('separates target-event retrieval from idea-landscape retrieval and marks first-party evidence',async()=>{
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async(url)=>String(url).endsWith('/fetch')
      ?new Response(JSON.stringify({markdown:'# Burning Token\nTracks, sponsors, judging criteria, prizes, rules and deadline.'}),{status:200})
      :new Response(JSON.stringify({results:[{name:'Focus-room alternatives',url:'https://products.example/focus',content:'Competitor and adoption evidence for multiplayer focus rooms.'}]}),{status:200}));
    const provider=new LinkupResearchProvider('secret');const input={hackathonUrl:'https://burning-token.example/',idea:'A multiplayer focus room for remote product teams'};const round=await provider.researchHackathon(input);
    const calls=fetchMock.mock.calls.map(call=>({endpoint:String(call[0]),body:JSON.parse(String(call[1]?.body))}));
    expect(calls).toHaveLength(2);expect(calls[0]).toMatchObject({endpoint:'https://api.linkup.so/v1/fetch',body:{url:input.hackathonUrl,renderJs:true}});expect(calls[1].body.q).toContain(input.idea);
    expect(round.findings[0]).toMatchObject({confidence:96,relationship:'Target event · first-party'});expect(round.findings[1].relationship).toBe('Idea landscape');
    const gaps=await provider.identifyEvidenceGaps(round,input);expect(gaps.some(gap=>gap.includes('Verify the supplied hackathon'))).toBe(false);
    fetchMock.mockImplementation(async()=>new Response(JSON.stringify({results:[]}),{status:200,headers:{'Content-Type':'application/json'}}));const followUp=await provider.followUpSearch(gaps,input);
    expect(followUp.queries[0]).toContain(gaps[0]);expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body)).q).toContain(gaps[0]);
    const eventFollowUp=await provider.followUpSearch(['Verify the target hackathon tracks and judging criteria'],input);expect(eventFollowUp.queries[0]).toContain('Verify the target hackathon tracks and judging criteria');expect(eventFollowUp.queries[0]).not.toContain(input.idea);expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body)).includeDomains).toEqual(['burning-token.example']);
  });
});

describe('workflow resilience',()=>{
  it('retries a transient failure',async()=>{let calls=0;const result=await withRetry(async()=>{calls++;if(calls===1)throw new Error('503');return'ok'});expect(result).toEqual({value:'ok',attempts:2,recovered:true})});
  it('keeps idempotent results singular',()=>{const cache=new IdempotencyCache<number>();cache.set('run',1);cache.set('run',1);expect(cache.get('run')).toBe(1);expect(cache.size()).toBe(1)});
  it('retries transient child work but not paid inference or the parent chain',()=>{expect(CHILD_TASK_RETRY.maxRetries).toBe(3);expect(INFERENCE_TASK_RETRY.maxRetries).toBe(0);expect(ORCHESTRATOR_RETRY.maxRetries).toBe(0)});
});

describe('workflow routing',()=>{
  it('uses the local runner only in demo mode',async()=>{
    const report=mentorReport();const localRunner=vi.fn().mockResolvedValue(report);const renderRunner=vi.fn();
    const result=await runConfiguredAnalysis(focusInput,'demo-key',{APP_MODE:'demo'},{localRunner,renderRunner});
    expect(localRunner).toHaveBeenCalledWith(focusInput,'demo-key');expect(renderRunner).not.toHaveBeenCalled();expect(result.execution.kind).toBe('demo-local');
  });
  it('uses Render in live mode and never calls the local runner',async()=>{
    const report=mentorReport();const localRunner=vi.fn();const renderRunner=vi.fn().mockResolvedValue({report,workflowRunId:'trn-live',status:'succeeded',taskSlug:'pivot-analysis/run_analysis'});
    const result=await runConfiguredAnalysis(focusInput,'live-key',{APP_MODE:'live',RENDER_API_KEY:'secret',RENDER_WORKFLOW_ID:'pivot-analysis/run_analysis'},{localRunner,renderRunner});
    expect(renderRunner).toHaveBeenCalledWith(focusInput,'live-key',expect.objectContaining({APP_MODE:'live'}));expect(localRunner).not.toHaveBeenCalled();expect(result.execution).toMatchObject({kind:'render',workflowRunId:'trn-live',status:'succeeded'});
  });
  it('surfaces a Render failure without replacing it with local execution',async()=>{
    const localRunner=vi.fn();const renderRunner=vi.fn().mockRejectedValue(new Error('Render is unavailable'));
    await expect(runConfiguredAnalysis(focusInput,'failed-key',{APP_MODE:'live'},{localRunner,renderRunner})).rejects.toThrow('Render is unavailable');expect(localRunner).not.toHaveBeenCalled();
  });
  it('sends exactly two positional arguments and returns the polled Render result',async()=>{
    const report=mentorReport();
    const fetchImpl=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({id:'trn-123',status:'pending'}),{status:202})).mockResolvedValueOnce(new Response(JSON.stringify({id:'trn-123',status:'succeeded',results:[{report,status:'complete'}]}),{status:200}));
    vi.spyOn(console,'info').mockImplementation(()=>undefined);
    const result=await runRenderWorkflow(focusInput,'positional-key',{RENDER_API_KEY:'never-log-me',RENDER_WORKFLOW_ID:'pivot-analysis/run_analysis'},{fetchImpl,wait:async()=>undefined,pollIntervalMs:0,timeoutMs:1000});
    const startBody=JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(startBody).toEqual({task:'pivot-analysis/run_analysis',input:[focusInput,'positional-key']});expect(fetchImpl.mock.calls[1][0]).toBe('https://api.render.com/v1/task-runs/trn-123');expect(result.report.analysisId).toBe(report.analysisId);expect(result.workflowRunId).toBe('trn-123');
  });
  it('keeps workflow numbering within its total and derives stable report IDs',async()=>{
    expect(workflowOrdinal(0,9)).toBe(1);expect(workflowOrdinal(9,9)).toBe(9);expect(workflowOrdinal(10,9)).toBe(9);expect(await analysisIdFor('same-key')).toBe(await analysisIdFor('same-key'));
  });
});

describe('target-event resolution',()=>{
  afterEach(()=>vi.restoreAllMocks());

  it('canonicalizes an event URL into host, slug, path and label',()=>{
    const id=canonicalizeEventUrl('https://ethglobal.com/events/ethonline2026');
    expect(id).toMatchObject({host:'ethglobal.com',collection:'/events',slug:'ethonline2026',eventPath:'/events/ethonline2026',baseEventUrl:'https://ethglobal.com/events/ethonline2026'});
    expect(id?.label).toBe('ETHOnline 2026');
    expect(canonicalizeEventUrl('https://www.ethglobal.com/events/ETHOnline2026/prizes')?.slug).toBe('ethonline2026');
    expect(canonicalizeEventUrl('')).toBeNull();
    expect(canonicalizeEventUrl('not a url')).toBeNull();
    // Organizer root with no specific event resolves host but no slug.
    expect(canonicalizeEventUrl('https://ethglobal.com/')).toMatchObject({host:'ethglobal.com',slug:'',eventPath:''});
  });

  it('humanizes ETH-style slugs',()=>{
    expect(humanizeSlug('ethonline2026')).toBe('ETHOnline 2026');
    expect(humanizeSlug('eth-denver-2025')).toBe('ETH Denver 2025');
  });

  it('classifies same-organizer other-event pages as OTHER_EVENT, not target-event first-party',()=>{
    const id=canonicalizeEventUrl('https://ethglobal.com/events/ethonline2026')!;
    expect(classifyEvidence('https://ethglobal.com/events/ethonline2026/prizes',id)).toBe('TARGET_EVENT_FIRST_PARTY');
    expect(classifyEvidence('https://ethglobal.com/events/ethdenver2025/prizes',id)).toBe('OTHER_EVENT');
    expect(classifyEvidence('https://ethglobal.com/about',id)).toBe('ORGANIZER_GENERAL');
    expect(classifyEvidence('https://someblog.dev/ethonline-recap',id)).toBe('THIRD_PARTY_RELEVANT');
  });

  it('fetches a prize page discovered on the exact target URL before any search',async()=>{
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,init)=>{
      const body=JSON.parse(String(init?.body));
      if(String(url).endsWith('/fetch')&&body.url.endsWith('/ethonline2026'))return new Response(JSON.stringify({markdown:'# ETHOnline 2026\n[Prizes](/events/ethonline2026/prizes)'}),{status:200});
      if(String(url).endsWith('/fetch'))return new Response(JSON.stringify({markdown:'# ETHOnline 2026 Prizes\nSponsors Hedera and ENS. Prize tracks, judging criteria, rules, submission deadline.'}),{status:200});
      return new Response(JSON.stringify({results:[{name:'Landscape',url:'https://research.example/reputation',content:'Competitors and adoption evidence.'}]}),{status:200});
    });
    const input={hackathonUrl:'https://ethglobal.com/events/ethonline2026',idea:'Blue Router: an onchain reputation router using Hedera, ENS and Bazantic.'};
    const round=await new LinkupResearchProvider('secret').researchHackathon(input);
    const calls=fetchMock.mock.calls.map(call=>({endpoint:String(call[0]),body:JSON.parse(String(call[1]?.body))}));
    expect(calls[0].body.url).toBe(input.hackathonUrl);expect(calls[1].body.url).toBe('https://ethglobal.com/events/ethonline2026/prizes');expect(calls.slice(0,2).every(call=>call.endpoint.endsWith('/fetch'))).toBe(true);
    expect(round.findings.find(f=>f.url.endsWith('/prizes'))).toMatchObject({relationship:'Target event · first-party',summary:expect.stringContaining('Hedera')});
  });

  it('rejects another event even when Linkup returns it from the official domain search',async()=>{
    vi.spyOn(console,'warn').mockImplementation(()=>undefined);
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,init)=>{
      const body=JSON.parse(String(init?.body));
      if(String(url).endsWith('/fetch'))return new Response('',{status:404});
      if(body.includeDomains)return new Response(JSON.stringify({results:[
        {name:'ETHDenver prizes',url:'https://ethglobal.com/events/ethdenver2025/prizes',content:'Polygon sponsor prizes.'},
        {name:'ETHOnline prizes',url:'https://ethglobal.com/events/ethonline2026/prizes',content:'Hedera and ENS sponsors, prize tracks, judging and rules.'},
      ]}),{status:200});
      return new Response(JSON.stringify({results:[{name:'Landscape',url:'https://research.example/reputation',content:'Competitors and adoption evidence.'}]}),{status:200});
    });
    const input={hackathonUrl:'https://ethglobal.com/events/ethonline2026',idea:'Blue Router onchain reputation'};
    const round=await new LinkupResearchProvider('secret').researchHackathon(input);
    expect(round.findings.some(f=>f.url.includes('ethdenver2025'))).toBe(false);expect(round.findings.find(f=>f.url.includes('ethonline2026/prizes'))?.summary).toContain('Hedera');
    const eventSearch=fetchMock.mock.calls.map(call=>JSON.parse(String(call[1]?.body))).find(body=>body.includeDomains);expect(eventSearch.includeDomains).toEqual(['ethglobal.com']);
  });

  // B: when the target event's own page confirms sponsors, the deterministic
  // sponsor-fit gate keeps them (they are not labeled unverified).
  it('keeps sponsors that appear in target-event first-party evidence',()=>{
    const research:ResearchRound[]=[{round:1,focus:'Target event resolution + idea landscape',queries:['q'],gaps:[],findings:[{id:'r1-0-x',title:'ETHOnline 2026 prizes',url:'https://ethglobal.com/events/ethonline2026/prizes',retrievedAt:'2026-09-10T00:00:00.000Z',query:'q',summary:'ETHOnline 2026 sponsors: Hedera, ENS and Bazantic with prize tracks.',claimSupported:'First-party evidence from the target event page',confidence:92,relationship:'Target event · first-party',demo:false}]}];
    const a=assessment({sponsorFit:[
      {name:'Hedera',fit:'NATURAL',reason:'Native to the onchain reputation flow.'},
      {name:'ENS',fit:'POSSIBLE',reason:'Identity naming fits reputation.'},
    ]});
    const report=buildLiveMentorReport({idea:'Blue Router onchain reputation',hackathonUrl:'https://ethglobal.com/events/ethonline2026'},research,a,'report-sponsors');
    const names=report.sponsorFit.map(s=>s.name);
    expect(names).toContain('Hedera');
    expect(names).toContain('ENS');
    expect(report.sponsorFit.some(s=>s.fit==='UNKNOWN')).toBe(false);
  });

  it('keeps target-event facts UNKNOWN when direct pages and official search are unavailable',async()=>{
    vi.spyOn(console,'warn').mockImplementation(()=>undefined);
    vi.spyOn(globalThis,'fetch').mockImplementation(async(url,init)=>{
      const body=JSON.parse(String(init?.body));
      if(String(url).endsWith('/fetch'))return new Response('',{status:404});
      if(body.includeDomains)return new Response(JSON.stringify({results:[{name:'ETHDenver 2025',url:'https://ethglobal.com/events/ethdenver2025/prizes',content:'Sponsors and prizes for a different event.'}]}),{status:200});
      return new Response(JSON.stringify({results:[{name:'Landscape',url:'https://research.example/x',content:'Competitor and adoption evidence.'}]}),{status:200});
    });
    const provider=new LinkupResearchProvider('secret');
    const input={hackathonUrl:'https://ethglobal.com/events/ethonline2026',idea:'Blue Router onchain reputation'};
    const round=await provider.researchHackathon(input);
    const gaps=await provider.identifyEvidenceGaps(round,input);
    expect(round.findings.some(f=>f.relationship==='Target event · first-party')).toBe(false);
    expect(round.findings.some(f=>f.url.includes('ethdenver2025'))).toBe(false);expect(gaps.some(g=>/first-party sources/i.test(g))).toBe(true);
    const a=assessment({sponsorFit:[{name:'Hedera',fit:'NATURAL',reason:'x'}]});
    const report=buildLiveMentorReport(input,[round],a,'report-unknown');
    expect(report.sponsorFit.every(s=>s.fit==='UNKNOWN')).toBe(true);
  });
});
