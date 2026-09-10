import { buildMentorPrompt, MENTOR_SYSTEM_PROMPT } from '@/lib/prompts';
import { parseModelJson } from '@/lib/schemas';
import type { AnalysisInput, ResearchRound } from '@/lib/types';
import type { MentorInferenceProvider } from './types';

export class NebiusInferenceProvider implements MentorInferenceProvider {
  constructor(private apiKey:string,private baseUrl='https://api.tokenfactory.nebius.com/v1',private model='Qwen/Qwen3-235B-A22B-Instruct-2507'){}
  async evaluate(input:AnalysisInput,research:ResearchRound[]){
    const response=await fetch(`${this.baseUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:this.model,response_format:{type:'json_object'},temperature:.2,messages:[{role:'system',content:MENTOR_SYSTEM_PROMPT},{role:'user',content:buildMentorPrompt({input,research})}]})});
    if(!response.ok) throw new Error(`Nebius evaluation failed (${response.status})`);
    const body=await response.json() as {choices?:{message?:{content?:string}}[]};
    return parseModelJson(body.choices?.[0]?.message?.content??'');
  }
}
