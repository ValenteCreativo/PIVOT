// Vercel has no Cloudflare D1 binding. The persistence layer already treats a
// missing DB as optional, so the Next.js build aliases cloudflare:workers here.
export const env: { DB?: D1Database } = {};
