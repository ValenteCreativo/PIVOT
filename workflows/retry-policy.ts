export const CHILD_TASK_RETRY = {maxRetries:3,waitDurationMs:1000,backoffScaling:2} as const;

// The provider retries network, 429, and 5xx failures itself. A successful
// inference response that fails strict parsing is deterministic and must not
// trigger another paid model invocation at the Render task layer.
export const INFERENCE_TASK_RETRY = {maxRetries:0,waitDurationMs:1000,backoffScaling:1} as const;

// Child tasks own their retries. Retrying the orchestrator would replay already
// successful research after a downstream task exhausts its own attempts.
export const ORCHESTRATOR_RETRY = {maxRetries:0,waitDurationMs:1000,backoffScaling:1} as const;
