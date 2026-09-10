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
  private normalize(results:LinkupResult[],query:string,round:number):ResearchFinding[]{return results.slice(0,6).filter(r=>r.url).map((r,i)=>({id:`r${round}-${i}-${encodeURIComponent(r.url!).slice(-18)}`,title:r.name??'Untitled source',url:r.url!,retrievedAt:new Date().toISOString(),query,summary:(r.content??'').slice(0,700),claimSupported:'Relevant evidence for mentor review',confidence:70,relationship:'External evidence',demo:false}));}
  async researchHackathon(input:AnalysisInput):Promise<ResearchRound>{const query=`${input.hackathonUrl??''} hackathon tracks sponsors judging criteria competitors for ${input.idea}`;const results=await this.search(query);return{round:1,focus:'Hackathon, sponsors, and landscape',queries:[query],findings:this.normalize(results,query,1),gaps:[]};}
  async identifyEvidenceGaps(round:ResearchRound,input:AnalysisInput):Promise<string[]>{void input;const text=round.findings.map(f=>f.summary).join(' ');return [text.match(/pricing|pay|purchase/i)?'Validate repeated user pain':'Find willingness-to-pay or adoption evidence',round.findings.length<3?'Find more independent sources':'Check direct competitor differentiation'];}
  async followUpSearch(gaps:string[],input:AnalysisInput):Promise<ResearchRound>{const query=`${gaps.join('; ')} for ${input.idea}`;const results=await this.search(query);return{round:2,focus:'Evidence gaps identified after Round 1',queries:[query],findings:this.normalize(results,query,2),gaps:results.length?['Validate claims with target-user interviews']:['Research provider returned no follow-up results']};}
}
