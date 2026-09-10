export const CHILD_TASK_RETRY = {maxRetries:3,waitDurationMs:1000,backoffScaling:2} as const;

// Child tasks own their retries. Retrying the orchestrator would replay already
// successful research after a downstream task exhausts its own attempts.
export const ORCHESTRATOR_RETRY = {maxRetries:0,waitDurationMs:1000,backoffScaling:1} as const;
