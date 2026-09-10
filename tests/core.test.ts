import { afterEach,describe,expect,it,vi } from 'vitest';
import { nearMissFor, normalizeScore, verdictFor } from '@/lib/scoring';
import { analysisInputSchema, CANONICAL_DIMENSION_KEYS, mentorInferenceJsonSchema, parseModelJson } from '@/lib/schemas';
import { detectMode } from '@/providers/mode';
import { DemoResearchProvider } from '@/providers/research/demo';
import { IdempotencyCache, withRetry } from '@/workflows/retry';
import { CHILD_TASK_RETRY, ORCHESTRATOR_RETRY } from '@/workflows/retry-policy';
import { NebiusInferenceProvider } from '@/providers/inference/nebius';

afterEach(()=>vi.restoreAllMocks());

describe('mentor scoring',()=>{
  it('normalizes and clamps dimension scores',()=>expect(normalizeScore([{key:'Evidence',score:12,max:8,note:''}])).toBe(8));
  it('uses confidence and evidence to temper verdicts',()=>{expect(verdictFor(84,80,70)).toBe('ALL IN');expect(verdictFor(84,40,30)).toBe('DOUBLE DOWN')});
  it('calculates constructive near misses',()=>expect(nearMissFor(77,'DOUBLE DOWN')).toEqual({nextVerdict:'ALL IN',points:3}));
});
describe('providers and schemas',()=>{
  it('detects explicit and automatic modes',()=>{expect(detectMode({APP_MODE:'demo'})).toBe('demo');expect(detectMode({LINKUP_API_KEY:'x',NEBIUS_API_KEY:'y'})).toBe('live')});
  it('rejects underspecified input',()=>expect(()=>analysisInputSchema.parse({idea:'tiny'})).toThrow());
  it('parses fenced structured model output',()=>{const body={score:50,confidence:60,summary:'x',dimensions:['Problem clarity','User specificity','Novelty','Feasibility','Hackathon scope','Demoability','Sponsor fit','Adoption','Impact','Evidence'].map(key=>({key,score:5,max:10,note:'x'})),strengths:['x'],weaknesses:['x'],uncertainties:[],pivot:'x',hardTruth:'x'};expect(parseModelJson('```json\n'+JSON.stringify(body)+'\n```').score).toBe(50)});
  it('normalizes the malformed GLM dimension labels and explanatory fields from the Render run',()=>{
    const keys=['problem clarity','User-Specificity','NOVELTY','Real-world feasibility','Hackathon Scope (12 pts)','Demo Ability','Sponsor / Track Fit','Business & Adoption Model','Impact / Utility','Evidence Quality'];
    const dimensions=keys.map((key,index)=>index===9?{key,score:5,max:8}:{key,score:5,max:index===1||index===8?8:index===2||index===3||index===4?12:10,rationale:`Why ${key} scored this way`});
    const parsed=parseModelJson(JSON.stringify({score:55,confidence:70,summary:'Specific assessment',dimensions,strengths:['Scoped'],weaknesses:['Evidence gap'],uncertainties:[],pivot:'Narrow the workflow',hardTruth:'Validate demand'}));
    expect(parsed.dimensions.map(d=>d.key)).toEqual([...CANONICAL_DIMENSION_KEYS]);
    expect(parsed.dimensions[0].note).toBe('Why problem clarity scored this way');
    expect(parsed.dimensions[9].note).toBe('Scored 5 of 8; the model supplied no additional explanation.');
  });
  it('rejects unknown or ambiguous dimension labels',()=>{
    const dimensions:{key:string;score:number;max:number;note:string}[]=CANONICAL_DIMENSION_KEYS.map(key=>({key,score:5,max:10,note:'reason'}));dimensions[3]={...dimensions[3],key:'Technical magic'};
    expect(()=>parseModelJson(JSON.stringify({score:50,confidence:70,summary:'x',dimensions,strengths:['x'],weaknesses:['x'],uncertainties:[],pivot:'x',hardTruth:'x'}))).toThrow('Unknown mentor dimension label');
  });
  it('requires key, score, max, and note in the provider JSON schema',()=>expect(mentorInferenceJsonSchema.schema.properties.dimensions.items.required).toEqual(['key','score','max','note']));
  it('requests strict JSON Schema from the environment-selected Nebius model',async()=>{
    const dimensions=CANONICAL_DIMENSION_KEYS.map(key=>({key,score:5,max:10,note:'Evidence-based reason'}));
    const content=JSON.stringify({score:50,confidence:70,summary:'x',dimensions,strengths:['x'],weaknesses:['x'],uncertainties:[],pivot:'x',hardTruth:'x'});
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
    await new NebiusInferenceProvider('secret-not-for-logs','zai-org/GLM-5.3-Flash').evaluate({idea:'A sufficiently detailed test idea'},[]);
    const request=JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.model).toBe('zai-org/GLM-5.3-Flash');expect(request.response_format.type).toBe('json_schema');expect(request.response_format.json_schema.strict).toBe(true);
  });
  it('logs the raw model response on validation failure without logging the API key',async()=>{
    const dimensions:{key:string;score:number;max:number;note:string}[]=CANONICAL_DIMENSION_KEYS.map(key=>({key,score:5,max:10,note:'reason'}));dimensions[0]={...dimensions[0],key:'Unrecognized dimension'};
    const content=JSON.stringify({score:50,confidence:70,summary:'x',dimensions,strengths:['x'],weaknesses:['x'],uncertainties:[],pivot:'x',hardTruth:'x'});
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
    const errorLog=vi.spyOn(console,'error').mockImplementation(()=>undefined);
    await expect(new NebiusInferenceProvider('never-log-this-key','model-from-env').evaluate({idea:'A sufficiently detailed test idea'},[])).rejects.toThrow('Unknown mentor dimension label');
    const logged=JSON.stringify(errorLog.mock.calls);expect(logged).toContain('Unrecognized dimension');expect(logged).not.toContain('never-log-this-key');
  });
  it('derives follow-up queries from Round 1 gaps',async()=>{const p=new DemoResearchProvider();const input={idea:'AI climate app'};const one=await p.researchHackathon(input);const gaps=await p.identifyEvidenceGaps(one,input);const two=await p.followUpSearch(gaps,input);expect(two.queries[0]).toContain(gaps[0]);expect(two.round).toBe(2)});
});
describe('workflow resilience',()=>{
  it('retries a transient failure',async()=>{let calls=0;const result=await withRetry(async()=>{calls++;if(calls===1)throw new Error('503');return'ok'});expect(result).toEqual({value:'ok',attempts:2,recovered:true})});
  it('keeps idempotent results singular',()=>{const cache=new IdempotencyCache<number>();cache.set('run',1);cache.set('run',1);expect(cache.get('run')).toBe(1);expect(cache.size()).toBe(1)});
  it('retries child tasks without retrying the parent orchestration chain',()=>{expect(CHILD_TASK_RETRY.maxRetries).toBe(3);expect(ORCHESTRATOR_RETRY.maxRetries).toBe(0)});
});
