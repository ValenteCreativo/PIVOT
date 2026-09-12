import type { AnalysisInput, ResearchFinding, ResearchRound } from '@/lib/types';
import type { ResearchProvider } from './types';

type LinkupResult = { name?:string; url?:string; content?:string };
export class LinkupResearchProvider implements ResearchProvider {
  constructor(private apiKey:string) {}
  private async search(query:string):Promise<LinkupResult[]> {
    const response=await fetch('https://api.linkup.so/v1/search',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({q:query,depth:'standard',outputType:'searchResults'})});
    if(!response.ok) throw new Error(`Linkup research failed (${response.status})`);
    const data=await response.json() as {results?:LinkupResult[]}; return data.results??[];
  }
  private targetDomain(input:AnalysisInput){try{return input.hackathonUrl?new URL(input.hackathonUrl).hostname.replace(/^www\./,''):'';}catch{return'';}}
  private normalize(results:LinkupResult[],query:string,round:number,relationship:string,targetDomain=''):ResearchFinding[]{return results.slice(0,6).filter(r=>r.url).map((r,i)=>{let firstParty=false;try{const host=new URL(r.url!).hostname.replace(/^www\./,'');firstParty=Boolean(targetDomain&&(host===targetDomain||host.endsWith(`.${targetDomain}`)));}catch{/* Invalid provider URLs are retained as unverified evidence. */}return{id:`r${round}-${i}-${encodeURIComponent(r.url!).slice(-18)}`,title:r.name??'Untitled source',url:r.url!,retrievedAt:new Date().toISOString(),query,summary:(r.content??'').slice(0,700),claimSupported:firstParty?'First-party evidence about the target event':relationship==='Target event lead'?'Possible evidence about the supplied event':'Evidence about the submitted idea landscape',confidence:firstParty?92:relationship==='Target event lead'?58:72,relationship:firstParty?'Target event · first-party':relationship,demo:false};});}
  private dedupe(findings:ResearchFinding[]){const urls=new Set<string>();return findings.filter(f=>{const key=f.url.replace(/\/$/,'');if(urls.has(key))return false;urls.add(key);return true;});}
  async researchHackathon(input:AnalysisInput):Promise<ResearchRound>{
    const targetDomain=this.targetDomain(input);
    const eventQuery=input.hackathonUrl?`site:${targetDomain} hackathon tracks challenges sponsors judging criteria prizes submission requirements deadlines`:'hackathon tracks sponsors judging criteria for the submitted project context';
    const landscapeQuery=`${input.idea} competitors alternatives technical precedent user problem evidence adoption willingness to pay`;
    const [eventResults,landscapeResults]=await Promise.all([this.search(eventQuery),this.search(landscapeQuery)]);
    const findings=this.dedupe([...this.normalize(eventResults,eventQuery,1,'Target event lead',targetDomain),...this.normalize(landscapeResults,landscapeQuery,1,'Idea landscape')]);
    return{round:1,focus:'Target event + idea landscape',queries:[eventQuery,landscapeQuery],findings,gaps:[]};
  }
  async identifyEvidenceGaps(round:ResearchRound,input:AnalysisInput):Promise<string[]>{
    const targetDomain=this.targetDomain(input),eventFindings=round.findings.filter(f=>f.relationship.startsWith('Target event')),landscape=round.findings.filter(f=>f.relationship==='Idea landscape');
    const eventText=eventFindings.map(f=>`${f.title} ${f.summary}`).join(' '),landscapeText=landscape.map(f=>`${f.title} ${f.summary}`).join(' '),gaps:string[]=[];
    if(input.hackathonUrl&&!eventFindings.some(f=>f.relationship.includes('first-party')))gaps.push(`Verify the supplied hackathon on first-party sources${targetDomain?` from ${targetDomain}`:''}`);
    if(!/tracks?|challenges?|judg(?:e|ing)|criteria/i.test(eventText))gaps.push('Verify the target hackathon tracks and judging criteria');
    if(!/sponsors?|partners?/i.test(eventText))gaps.push('Verify the target hackathon sponsors and sponsor challenges');
    if(!/competitor|alternative|similar|versus|market/i.test(landscapeText))gaps.push('Find direct competitors and explain the submitted idea’s differentiation');
    if(!/pricing|pay|purchase|adoption|usage|retention|demand/i.test(landscapeText))gaps.push('Find adoption, repeated-use, or willingness-to-pay evidence for the target user');
    return gaps.slice(0,4).length?gaps.slice(0,4):['Validate the most important claims with direct target-user evidence'];
  }
  async followUpSearch(gaps:string[],input:AnalysisInput):Promise<ResearchRound>{
    const targetDomain=this.targetDomain(input),queries=gaps.slice(0,3).map(gap=>targetDomain&&/hackathon|event|track|sponsor|judg|prize|deadline|submission/i.test(gap)?`site:${targetDomain} ${gap}`:`${gap}. Target project: ${input.idea}`);
    const batches=await Promise.all(queries.map(query=>this.search(query)));
    const findings=this.dedupe(batches.flatMap((results,index)=>this.normalize(results,queries[index],2,'Gap-directed follow-up',targetDomain))).slice(0,9);
    return{round:2,focus:'Gap-directed follow-up research',queries,findings,gaps:findings.length?['Direct interviews or usage data remain unverified by desk research']:['Research provider returned no follow-up results; the identified gaps remain UNKNOWN']};
  }
}
