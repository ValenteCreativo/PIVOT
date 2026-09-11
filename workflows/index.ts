import type { AnalysisInput, MentorReport } from '@/lib/types';
import { detectMode } from '@/providers/mode';
import { runRenderWorkflow, type RenderWorkflowResult } from './render';

type RuntimeEnvironment = Record<string, string | undefined>;
type ExecutionDependencies = {
  localRunner?: (input: AnalysisInput, idempotencyKey: string) => Promise<MentorReport>;
  renderRunner?: (input: AnalysisInput, idempotencyKey: string, env: RuntimeEnvironment) => Promise<RenderWorkflowResult>;
};
export type AnalysisExecution = { report: MentorReport; execution: { kind: 'demo-local' | 'render'; taskSlug?: string; workflowRunId?: string; status: string } };

export async function runConfiguredAnalysis(input: AnalysisInput, idempotencyKey: string, env: RuntimeEnvironment = process.env, dependencies: ExecutionDependencies = {}): Promise<AnalysisExecution> {
  if (detectMode(env) === 'demo') {
    const localRunner = dependencies.localRunner ?? (await import('./local')).runAnalysis;
    const report = await localRunner(input, idempotencyKey);
    return { report, execution: { kind: 'demo-local', status: 'completed' } };
  }
  const result = await (dependencies.renderRunner ?? runRenderWorkflow)(input, idempotencyKey, env);
  return { report: result.report, execution: { kind: 'render', taskSlug: result.taskSlug, workflowRunId: result.workflowRunId, status: result.status } };
}
