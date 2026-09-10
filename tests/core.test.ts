import { describe,expect,it } from 'vitest';
import { nearMissFor, normalizeScore, verdictFor } from '@/lib/scoring';
import { analysisInputSchema, parseModelJson } from '@/lib/schemas';
import { detectMode } from '@/providers/mode';
import { DemoResearchProvider } from '@/providers/research/demo';
import { IdempotencyCache, withRetry } from '@/workflows/retry';

describe('mentor scoring',()=>{
  it('normalizes and clamps dimension scores',()=>expect(normalizeScore([{key:'Evidence',score:12,max:8,note:''}])).toBe(8));
  it('uses confidence and evidence to temper verdicts',()=>{expect(verdictFor(84,80,70)).toBe('ALL IN');expect(verdictFor(84,40,30)).toBe('DOUBLE DOWN')});
  it('calculates constructive near misses',()=>expect(nearMissFor(77,'DOUBLE DOWN')).toEqual({nextVerdict:'ALL IN',points:3}));
});
describe('providers and schemas',()=>{
  it('detects explicit and automatic modes',()=>{expect(detectMode({APP_MODE:'demo'})).toBe('demo');expect(detectMode({LINKUP_API_KEY:'x',NEBIUS_API_KEY:'y'})).toBe('live')});
  it('rejects underspecified input',()=>expect(()=>analysisInputSchema.parse({idea:'tiny'})).toThrow());
  it('parses fenced structured model output',()=>{const body={score:50,confidence:60,summary:'x',dimensions:['Problem clarity','User specificity','Novelty','Feasibility','Hackathon scope','Demoability','Sponsor fit','Adoption','Impact','Evidence'].map(key=>({key,score:5,max:10,note:'x'})),strengths:['x'],weaknesses:['x'],uncertainties:[],pivot:'x',hardTruth:'x'};expect(parseModelJson('```json\n'+JSON.stringify(body)+'\n```').score).toBe(50)});
  it('derives follow-up queries from Round 1 gaps',async()=>{const p=new DemoResearchProvider();const input={idea:'AI climate app'};const one=await p.researchHackathon(input);const gaps=await p.identifyEvidenceGaps(one,input);const two=await p.followUpSearch(gaps,input);expect(two.queries[0]).toContain(gaps[0]);expect(two.round).toBe(2)});
});
describe('workflow resilience',()=>{
  it('retries a transient failure',async()=>{let calls=0;const result=await withRetry(async()=>{calls++;if(calls===1)throw new Error('503');return'ok'});expect(result).toEqual({value:'ok',attempts:2,recovered:true})});
  it('keeps idempotent results singular',()=>{const cache=new IdempotencyCache<number>();cache.set('run',1);cache.set('run',1);expect(cache.get('run')).toBe(1);expect(cache.size()).toBe(1)});
});
