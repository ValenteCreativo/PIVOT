export type ProviderMode = 'demo' | 'live';
export function detectMode(env: Record<string, string | undefined> = process.env): ProviderMode {
  if (env.APP_MODE === 'demo') return 'demo';
  if (env.APP_MODE === 'live') return 'live';
  return env.LINKUP_API_KEY && env.NEBIUS_API_KEY ? 'live' : 'demo';
}
