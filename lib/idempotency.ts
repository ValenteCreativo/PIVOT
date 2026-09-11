export async function analysisIdFor(idempotencyKey: string) {
  const bytes = new TextEncoder().encode(idempotencyKey);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return `analysis-${Array.from(digest.slice(0, 12), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
