import type { AnalysisInput, ResearchFinding, ResearchRound } from '@/lib/types';
import type { ResearchProvider } from './types';

const now = '2026-09-10T18:00:00.000Z';
function finding(id:string,title:string,query:string,summary:string,claim:string,confidence:number,relationship:string): ResearchFinding {
  return { id, title, url:`https://demo-evidence.local/${id}`, retrievedAt:now, query, summary, claimSupported:claim, confidence, relationship, demo:true };
}
function theme(idea:string) { const v=idea.toLowerCase(); if(v.includes('climate')||v.includes('carbon'))return'climate'; if(v.includes('onchain')||v.includes('blockchain')||v.includes('defi'))return'chain'; if(v.includes('tiktok')||v.includes('social'))return'social'; if(v.includes('focus')||v.includes('productiv'))return'productivity'; if(v.includes('ridiculous')||v.includes('pigeon')||v.includes('silly'))return'fun'; return'general'; }

export class DemoResearchProvider implements ResearchProvider {
  async researchHackathon(input: AnalysisInput): Promise<ResearchRound> {
    const t=theme(input.idea);
    const market = t==='climate'?'Behavior-change products struggle when savings are abstract and delayed.':t==='chain'?'Portable reputation remains fragmented across protocols and identity models.':t==='social'?'Creator analytics is crowded; workflow-specific intelligence is a stronger entry point.':t==='productivity'?'Shared accountability is understandable, but retention depends on a repeated team ritual.':t==='fun'?'Fun-build judges reward an interaction that is legible in seconds and technically surprising.':'Comparable AI assistants compete on workflow depth, not chat alone.';
    return { round:1, focus:'Hackathon structure, sponsor fit, and competitive landscape', queries:['hackathon tracks and judging criteria',`${t} product competitive landscape`,'sponsor technology use cases'], findings:[
      finding(`${t}-tracks`,'Hackathon track map (curated fixture)','hackathon tracks and judging criteria','Linkup, Nebius, Render and Fun Build reward deep research, applied inference, resilient workflows and original interaction.','Sponsor integrations must be structurally necessary, not decorative.',94,'Sponsor fit'),
      finding(`${t}-market`,`${t[0].toUpperCase()+t.slice(1)} market signal (curated fixture)`,`${t} product competitive landscape`,market,'The broad concept needs a narrower workflow and audience.',78,'Novelty / adoption'),
      finding(`${t}-demo`,'Hackathon demo pattern study (curated fixture)','winning hackathon demo patterns','High-performing demos make the before/after visible within the first 40 seconds.','One crisp transformation is more competitive than a feature tour.',86,'Demoability'),
    ], gaps:['No direct evidence that the target user has this problem frequently.','No credible willingness-to-pay or adoption proxy yet.'] };
  }
  async identifyEvidenceGaps(round:ResearchRound,_input:AnalysisInput) { return round.gaps; }
  async followUpSearch(gaps:string[],input:AnalysisInput):Promise<ResearchRound>{
    const t=theme(input.idea);
    return {round:2,focus:'Behavior, adoption, and feasibility gaps from Round 1',queries:gaps.map(g=>`verify: ${g}`),findings:[
      finding(`${t}-behavior`,'User behavior proxy (curated fixture)',`verify frequency of ${t} problem`,'A repeated trigger exists only when the product attaches to an existing workflow rather than asking users to form a new habit.','Distribution through an existing team or creator workflow is more credible.',72,'Adoption'),
      finding(`${t}-api`,'Weekend feasibility check (curated fixture)',`available APIs for ${t} prototype`,'The core data flow can be mocked and one high-value path implemented with standard web APIs inside 24–48 hours.','A scoped proof is buildable; broad automation is not.',88,'Feasibility / scope'),
    ],gaps:['No interview, preorder, waitlist, or usage evidence from the proposed target user.']};
  }
}
