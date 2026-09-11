import { buildMentorPrompt, MENTOR_SYSTEM_PROMPT } from '@/lib/prompts';
import { mentorInferenceJsonSchema, parseModelJson } from '@/lib/schemas';
import type { AnalysisInput, ResearchRound } from '@/lib/types';
import type { MentorInferenceProvider } from './types';

type ResponseFormat = {type:'json_object'} | {type:'json_schema';json_schema:typeof mentorInferenceJsonSchema};
type NebiusMessage = {content?:unknown;reasoning_content?:unknown;refusal?:string|null;tool_calls?:unknown[]|null};
type NebiusChoice = {finish_reason?:string|null;text?:unknown;message?:NebiusMessage};
type NebiusBody = {id?:string;model?:string;choices?:NebiusChoice[];usage?:{completion_tokens?:number;prompt_tokens?:number;total_tokens?:number;reasoning_tokens?:number;completion_tokens_details?:{reasoning_tokens?:number}}};
type ProviderOptions = {fetchImpl?:typeof fetch;wait?: (milliseconds:number)=>Promise<void>};

const MAX_COMPLETION_TOKENS=12_000;
const MAX_TRANSIENT_ATTEMPTS=3;

function messageContent(value:unknown){
  if(typeof value==='string')return value;
  if(Array.isArray(value)&&value.every(part=>part&&typeof part==='object'&&'text' in part&&typeof part.text==='string'))return value.map(part=>(part as {text:string}).text).join('');
  return '';
}
function safePreview(value:unknown,limit:number){return typeof value==='string'?value.slice(0,limit):value==null?'':`[non-string ${Array.isArray(value)?'array':typeof value}]`;}
function isTransientStatus(status:number){return status===429||status>=500;}

export class NebiusInferenceProvider implements MentorInferenceProvider {
  constructor(private apiKey:string,private model:string,private baseUrl='https://api.tokenfactory.nebius.com/v1',private options:ProviderOptions={}){}

  private async request(input:AnalysisInput,research:ResearchRound[],responseFormat:ResponseFormat){
    const fetchImpl=this.options.fetchImpl??fetch,wait=this.options.wait??(milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds)));
    for(let attempt=1;attempt<=MAX_TRANSIENT_ATTEMPTS;attempt++){
      try{
        const response=await fetchImpl(`${this.baseUrl.replace(/\/$/,'')}/chat/completions`,{
          method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},
          body:JSON.stringify({model:this.model,max_completion_tokens:MAX_COMPLETION_TOKENS,reasoning_effort:'low',response_format:responseFormat,temperature:.15,messages:[{role:'system',content:MENTOR_SYSTEM_PROMPT},{role:'user',content:buildMentorPrompt({TARGET_PROJECT:input,TARGET_HACKATHON_RESEARCH:research})}]})
        });
        if(!isTransientStatus(response.status)||attempt===MAX_TRANSIENT_ATTEMPTS)return response;
        console.warn('Transient Nebius response; retrying provider request.',{model:this.model,status:response.status,attempt,nextAttempt:attempt+1});
      }catch(error){
        if(attempt===MAX_TRANSIENT_ATTEMPTS)throw error;
        console.warn('Transient Nebius network error; retrying provider request.',{model:this.model,attempt,nextAttempt:attempt+1,error:error instanceof Error?error.message:String(error)});
      }
      await wait(500*2**(attempt-1));
    }
    throw new Error('Nebius request exhausted transient retries');
  }

  async evaluate(input:AnalysisInput,research:ResearchRound[]){
    let responseFormat:ResponseFormat={type:'json_schema',json_schema:mentorInferenceJsonSchema};
    let response=await this.request(input,research,responseFormat);
    if(!response.ok&&[400,422].includes(response.status)){
      const providerError=(await response.text()).slice(0,4000);
      console.warn('Nebius model rejected JSON Schema response mode; retrying once with JSON object mode.',{model:this.model,status:response.status,providerError});
      responseFormat={type:'json_object'};
      response=await this.request(input,research,responseFormat);
    }
    if(!response.ok)throw new Error(`Nebius evaluation failed (${response.status})`);
    const body=await response.json() as NebiusBody;
    const choice=body.choices?.[0],message=choice?.message;
    if(message?.refusal)throw new Error(`Nebius declined the mentor evaluation: ${message.refusal}`);
    const raw=messageContent(message?.content??choice?.text);
    try{return parseModelJson(raw);}
    catch(error){
      console.error('Nebius structured output validation failed.',{
        model:this.model,responseId:body.id??null,responseFormat:responseFormat.type,finishReason:choice?.finish_reason??null,
        contentType:Array.isArray(message?.content)?'array':typeof message?.content,contentLength:raw.length,reasoningLength:typeof message?.reasoning_content==='string'?message.reasoning_content.length:0,
        toolCallCount:Array.isArray(message?.tool_calls)?message.tool_calls.length:0,usage:body.usage??null,
        validationError:error instanceof Error?error.message:String(error),rawContent:raw.slice(0,20000),reasoningPreview:safePreview(message?.reasoning_content,2000),truncated:raw.length>20000,
      });
      throw error;
    }
  }
}
