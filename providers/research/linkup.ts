import type { AnalysisInput, ResearchFinding, ResearchRound } from '@/lib/types';
import { canonicalizeEventUrl, classifyEvidence, type EventIdentity, type EvidenceClass } from '@/lib/event-url';
import type { ResearchProvider } from './types';

type LinkupResult = { name?:string; url?:string; content?:string };

// How each evidence class is surfaced. Only TARGET_EVENT_FIRST_PARTY carries
// the trust that lets it establish sponsors/prizes/tracks for the target event.
const CLASS_META: Record<EvidenceClass, { relationship: string; confidence: number; claim: string }> = {
  TARGET_EVENT_FIRST_PARTY: { relationship: 'Target event · first-party', confidence: 92, claim: 'First-party evidence from the target event page' },
  ORGANIZER_GENERAL: { relationship: 'Organizer · general (not event-specific)', confidence: 55, claim: 'Organizer-level context; not confirmed for this specific event' },
  OTHER_EVENT: { relationship: 'Other event by the same organizer', confidence: 30, claim: 'A different event by the same organizer; cannot confirm target-event facts' },
  THIRD_PARTY_RELEVANT: { relationship: 'Idea landscape', confidence: 72, claim: 'Evidence about the submitted idea landscape' },
  UNRELATED: { relationship: 'Unrelated source', confidence: 40, claim: 'Unrelated source' },
};

export class LinkupResearchProvider implements ResearchProvider {
  constructor(private apiKey:string) {}
  private async search(query:string):Promise<LinkupResult[]> {
    const response=await fetch('https://api.linkup.so/v1/search',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({q:query,depth:'standard',outputType:'searchResults'})});
    if(!response.ok) throw new Error(`Linkup research failed (${response.status})`);
    const data=await response.json() as {results?:LinkupResult[]}; return data.results??[];
  }

  private identity(input:AnalysisInput):EventIdentity|null{return canonicalizeEventUrl(input.hackathonUrl);}

  // Anchor an event search to BOTH the host and the specific event slug so results
  // are scoped to the target event rather than any event the organizer has ever run.
  private eventScope(identity:EventIdentity):string{
    return identity.slug ? `site:${identity.host}${identity.eventPath} OR site:${identity.host} "${identity.label}"` : `site:${identity.host}`;
  }

  private normalize(results:LinkupResult[],query:string,round:number,landscapeRelationship:string,identity:EventIdentity|null,eventScoped:boolean):ResearchFinding[]{
    return results.slice(0,6).filter(r=>r.url).map((r,i)=>{
      // Landscape queries always describe idea-landscape evidence; event-scoped
      // queries are classified strictly against the resolved target event.
      const evidenceClass:EvidenceClass=eventScoped?classifyEvidence(r.url!,identity):'THIRD_PARTY_RELEVANT';
      const meta=CLASS_META[evidenceClass];
      const relationship=eventScoped?meta.relationship:landscapeRelationship;
      const confidence=eventScoped?meta.confidence:CLASS_META.THIRD_PARTY_RELEVANT.confidence;
      const claimSupported=eventScoped?meta.claim:CLASS_META.THIRD_PARTY_RELEVANT.claim;
      return{id:`r${round}-${i}-${encodeURIComponent(r.url!).slice(-18)}`,title:r.name??'Untitled source',url:r.url!,retrievedAt:new Date().toISOString(),query,summary:(r.content??'').slice(0,700),claimSupported,confidence,relationship,demo:false};
    });
  }

  private dedupe(findings:ResearchFinding[]){const urls=new Set<string>();return findings.filter(f=>{const key=f.url.replace(/\/$/,'');if(urls.has(key))return false;urls.add(key);return true;});}

  private hasTargetFirstParty(findings:ResearchFinding[]){return findings.some(f=>f.relationship==='Target event · first-party');}

  async researchHackathon(input:AnalysisInput):Promise<ResearchRound>{
    const identity=this.identity(input);
    // Stage 1: resolve the TARGET event on its own first-party pages before broad
    // research. When a specific event slug is known, run a dedicated first-party
    // prizes/sponsors query anchored to that event path.
    const scope=identity?this.eventScope(identity):'';
    const eventQuery=identity
      ?`${scope} tracks challenges sponsors judging criteria prizes submission requirements deadlines`
      :'hackathon tracks sponsors judging criteria for the submitted project context';
    const sponsorQuery=identity&&identity.slug
      ?`site:${identity.host}${identity.eventPath} prizes sponsors tracks partner challenges`
      :'';
    const landscapeQuery=`${input.idea} competitors alternatives technical precedent user problem evidence adoption willingness to pay`;

    const searches:Promise<LinkupResult[]>[]=[this.search(eventQuery)];
    if(sponsorQuery)searches.push(this.search(sponsorQuery));
    searches.push(this.search(landscapeQuery));
    const results=await Promise.all(searches);

    const landscapeResults=results[results.length-1];
    const eventResultBatches=results.slice(0,results.length-1);
    const eventQueries=sponsorQuery?[eventQuery,sponsorQuery]:[eventQuery];
    const eventFindings=eventResultBatches.flatMap((batch,index)=>this.normalize(batch,eventQueries[index],1,'Idea landscape',identity,Boolean(identity)));
    const landscapeFindings=this.normalize(landscapeResults,landscapeQuery,1,'Idea landscape',identity,false);

    const findings=this.dedupe([...eventFindings,...landscapeFindings]);
    return{round:1,focus:'Target event resolution + idea landscape',queries:[...eventQueries,landscapeQuery],findings,gaps:[]};
  }

  async identifyEvidenceGaps(round:ResearchRound,input:AnalysisInput):Promise<string[]>{
    const identity=this.identity(input);
    const eventFindings=round.findings.filter(f=>f.relationship.startsWith('Target event')||f.relationship.startsWith('Organizer')||f.relationship.startsWith('Other event'));
    const firstPartyFindings=round.findings.filter(f=>f.relationship==='Target event · first-party');
    const landscape=round.findings.filter(f=>f.relationship==='Idea landscape');
    // Only TARGET-EVENT first-party text may confirm event-specific facts.
    const eventText=firstPartyFindings.map(f=>`${f.title} ${f.summary}`).join(' ');
    const landscapeText=landscape.map(f=>`${f.title} ${f.summary}`).join(' ');
    const gaps:string[]=[];
    const eventName=identity?.label||'the supplied hackathon';
    if(input.hackathonUrl&&!this.hasTargetFirstParty(round.findings)){
      const seenOtherEvent=eventFindings.some(f=>f.relationship.startsWith('Other event'));
      gaps.push(seenOtherEvent
        ?`Confirm ${eventName} on its own event page${identity?.eventPath?` (${identity.host}${identity.eventPath})`:''} — other events by the same organizer do not confirm its sponsors`
        :`Verify ${eventName} on first-party sources${identity?.host?` from ${identity.host}${identity.eventPath}`:''}`);
    }
    if(!/tracks?|challenges?|judg(?:e|ing)|criteria/i.test(eventText))gaps.push(`Verify ${eventName} tracks and judging criteria from its own event page`);
    if(!/sponsors?|partners?/i.test(eventText))gaps.push(`Verify ${eventName} sponsors and sponsor challenges from its own event page`);
    if(!/competitor|alternative|similar|versus|market/i.test(landscapeText))gaps.push('Find direct competitors and explain the submitted idea’s differentiation');
    if(!/pricing|pay|purchase|adoption|usage|retention|demand/i.test(landscapeText))gaps.push('Find adoption, repeated-use, or willingness-to-pay evidence for the target user');
    return gaps.slice(0,4).length?gaps.slice(0,4):['Validate the most important claims with direct target-user evidence'];
  }

  async followUpSearch(gaps:string[],input:AnalysisInput):Promise<ResearchRound>{
    const identity=this.identity(input);
    const eventScoped=(gap:string)=>Boolean(identity)&&/hackathon|event|track|sponsor|partner|judg|prize|deadline|submission|criteria/i.test(gap);
    const queries=gaps.slice(0,3).map(gap=>{
      if(!eventScoped(gap))return`${gap}. Target project: ${input.idea}`;
      const scope=identity!.slug?`site:${identity!.host}${identity!.eventPath}`:`site:${identity!.host}`;
      return`${scope} ${gap}`;
    });
    const batches=await Promise.all(queries.map(query=>this.search(query)));
    const findings=this.dedupe(batches.flatMap((results,index)=>this.normalize(results,queries[index],2,'Gap-directed follow-up',identity,eventScoped(gaps[index])))).slice(0,9);
    return{round:2,focus:'Gap-directed follow-up research',queries,findings,gaps:findings.length?['Direct interviews or usage data remain unverified by desk research']:['Research provider returned no follow-up results; the identified gaps remain UNKNOWN']};
  }
}
