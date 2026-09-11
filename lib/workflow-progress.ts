export function workflowOrdinal(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(Math.max(completed + 1, 1), total);
}
