import { analysisInputSchema } from '@/lib/schemas';
import { runAnalysis } from '@/workflows/local';
export async function POST(request:Request){
  try{const input=analysisInputSchema.parse(await request.json());const idempotencyKey=request.headers.get('Idempotency-Key')??crypto.randomUUID();const report=await runAnalysis(input,idempotencyKey);return Response.json({report,idempotencyKey});}
  catch(error){const message=error instanceof Error?error.message:'Analysis failed';return Response.json({error:message},{status:400});}
}
