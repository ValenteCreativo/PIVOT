import type { AnalysisInput } from '@/lib/types';
export type RenderWorkflowResponse={workflowRunId:string;status:string};
export async function startRenderWorkflow(input:AnalysisInput,idempotencyKey:string):Promise<RenderWorkflowResponse>{
  const key=process.env.RENDER_API_KEY,workflowId=process.env.RENDER_WORKFLOW_ID;
  if(!key||!workflowId)throw new Error('Render workflow credentials are not configured');
  const response=await fetch('https://api.render.com/v1/task-runs',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({task:workflowId,input:{...input,idempotencyKey}})});
  if(!response.ok)throw new Error(`Render workflow start failed (${response.status})`);
  const data=await response.json() as {id?:string;status?:string;taskRun?:{id?:string;status?:string}};
  return {workflowRunId:data.id??data.taskRun?.id??'created',status:data.status??data.taskRun?.status??'pending'};
}
