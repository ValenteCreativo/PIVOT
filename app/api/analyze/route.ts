import { analysisInputSchema } from '@/lib/schemas';
import { runConfiguredAnalysis } from '@/workflows';

export const maxDuration = 300;

export async function POST(request:Request){
  try{const input=analysisInputSchema.parse(await request.json());const idempotencyKey=request.headers.get('Idempotency-Key')??crypto.randomUUID();const result=await runConfiguredAnalysis(input,idempotencyKey);return Response.json({...result,idempotencyKey});}
  catch(error){const message=error instanceof Error?error.message:'Analysis failed';const status=message.startsWith('Remote Render workflow failed')?502:400;return Response.json({error:message},{status});}
}
