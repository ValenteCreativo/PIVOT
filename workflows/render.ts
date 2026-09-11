import type { AnalysisInput, MentorReport } from '@/lib/types';

type RenderEnvironment = Record<string, string | undefined>;
type RenderTaskRun = { id?: string; status?: string; results?: unknown[]; error?: string };
export type RenderWorkflowResult = { report: MentorReport; workflowRunId: string; status: string; taskSlug: string };
type RenderOptions = { fetchImpl?: typeof fetch; wait?: (milliseconds: number) => Promise<void>; pollIntervalMs?: number; timeoutMs?: number };

const completed = new Map<string, Promise<RenderWorkflowResult>>();
const terminalStatuses = new Set(['completed', 'succeeded', 'failed', 'canceled']);

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function redact(message: string, secrets: string[]) { return secrets.filter(Boolean).reduce((safe, secret) => safe.split(secret).join('[REDACTED]'), message); }
function extractReport(details: RenderTaskRun): MentorReport {
  const first = details.results?.[0];
  const candidate = isRecord(first) && 'report' in first ? first.report : first;
  if (!isRecord(candidate) || typeof candidate.analysisId !== 'string' || typeof candidate.verdict !== 'string') throw new Error('Render workflow completed without a valid mentor report result');
  return candidate as MentorReport;
}
async function providerError(response: Response, action: string) {
  let message = '';
  try { const body = await response.json() as { message?: string; error?: string }; message = body.message ?? body.error ?? ''; } catch { /* Render can return a non-JSON error body. */ }
  return new Error(`${action} (${response.status})${message ? `: ${message}` : ''}`);
}

async function executeRenderWorkflow(input: AnalysisInput, idempotencyKey: string, env: RenderEnvironment, options: RenderOptions): Promise<RenderWorkflowResult> {
  const apiKey = env.RENDER_API_KEY ?? '', taskSlug = env.RENDER_WORKFLOW_ID ?? '';
  const fetchImpl = options.fetchImpl ?? fetch;
  const wait = options.wait ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const pollIntervalMs = options.pollIntervalMs ?? 1500, timeoutMs = options.timeoutMs ?? 285_000;
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey };
  let workflowRunId: string | undefined;
  console.info('Starting Render workflow.', { taskSlug: taskSlug || null });
  try {
    if (!apiKey || !taskSlug) throw new Error('Render workflow credentials are not configured');
    const start = await fetchImpl('https://api.render.com/v1/task-runs', { method: 'POST', headers, body: JSON.stringify({ task: taskSlug, input: [input, idempotencyKey] }) });
    if (!start.ok) throw await providerError(start, 'Render workflow start failed');
    const created = await start.json() as RenderTaskRun;
    workflowRunId = created.id;
    if (!workflowRunId) throw new Error('Render workflow start response did not include a run ID');
    console.info('Render workflow started.', { taskSlug, workflowRunId, status: created.status ?? 'pending' });
    const deadline = Date.now() + timeoutMs;
    let details = created;
    while (!details.status || !terminalStatuses.has(details.status)) {
      if (Date.now() >= deadline) throw new Error(`Render workflow polling timed out after ${Math.round(timeoutMs / 1000)} seconds`);
      await wait(pollIntervalMs);
      const response = await fetchImpl(`https://api.render.com/v1/task-runs/${encodeURIComponent(workflowRunId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!response.ok) throw await providerError(response, 'Render workflow status fetch failed');
      details = await response.json() as RenderTaskRun;
    }
    console.info('Render workflow finished.', { taskSlug, workflowRunId, finalStatus: details.status });
    if (details.status === 'failed' || details.status === 'canceled') throw new Error(details.error || `Render workflow ended with status ${details.status}`);
    return { report: extractReport(details), workflowRunId, status: details.status, taskSlug };
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : 'Unknown Render workflow error', [apiKey]);
    console.error('Render workflow failed.', { taskSlug, workflowRunId: workflowRunId ?? null, finalStatus: 'failed', error: message });
    throw new Error(`Remote Render workflow failed${workflowRunId ? ` (run ${workflowRunId})` : ''}: ${message}`);
  }
}

export function runRenderWorkflow(input: AnalysisInput, idempotencyKey: string, env: RenderEnvironment = process.env, options: RenderOptions = {}) {
  const existing = completed.get(idempotencyKey);
  if (existing) return existing;
  const pending = executeRenderWorkflow(input, idempotencyKey, env, options);
  completed.set(idempotencyKey, pending);
  pending.catch(() => completed.delete(idempotencyKey));
  if (completed.size > 100) completed.delete(completed.keys().next().value as string);
  return pending;
}
