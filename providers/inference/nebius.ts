import { buildMentorPrompt, MENTOR_SYSTEM_PROMPT } from '@/lib/prompts';
import { mentorInferenceJsonSchema, parseModelJson } from '@/lib/schemas';
import type { AnalysisInput, ResearchRound } from '@/lib/types';
import type { MentorInferenceProvider } from './types';

type ResponseFormat = {type:'json_object'} | {type:'json_schema';json_schema:typeof mentorInferenceJsonSchema};
type NebiusBody = {choices?:{message?:{content?:string|null;refusal?:string|null}}[]};

export class NebiusInferenceProvider implements MentorInferenceProvider {
  constructor(private apiKey:string,private model:string,private baseUrl='https://api.tokenfactory.nebius.com/v1'){}

  private request(input:AnalysisInput,research:ResearchRound[],responseFormat:ResponseFormat){
    return fetch(`${this.baseUrl.replace(/\/$/,'')}/chat/completions`,{
      method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:this.model,response_format:responseFormat,temperature:.15,messages:[{role:'system',content:MENTOR_SYSTEM_PROMPT},{role:'user',content:buildMentorPrompt({TARGET_PROJECT:input,TARGET_HACKATHON_RESEARCH:research})}]})
    });
  }

  async evaluate(input:AnalysisInput,research:ResearchRound[]){
    let response=await this.request(input,research,{type:'json_schema',json_schema:mentorInferenceJsonSchema});
    if(!response.ok&&[400,422].includes(response.status)){
      const providerError=(await response.text()).slice(0,4000);
      console.warn('Nebius model rejected JSON Schema response mode; retrying with JSON object mode.',{model:this.model,status:response.status,providerError});
      response=await this.request(input,research,{type:'json_object'});
    }
    if(!response.ok)throw new Error(`Nebius evaluation failed (${response.status})`);
    const body=await response.json() as NebiusBody;
    const message=body.choices?.[0]?.message;
    if(message?.refusal)throw new Error(`Nebius declined the mentor evaluation: ${message.refusal}`);
    const raw=message?.content??'';
    try{return parseModelJson(raw);}
    catch(error){
      console.error('Nebius structured output validation failed.',{
        model:this.model,
        validationError:error instanceof Error?error.message:String(error),
        rawResponse:raw.slice(0,20000),
        truncated:raw.length>20000,
      });
      throw error;
    }
  }
}
