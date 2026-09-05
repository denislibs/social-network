function req(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}
export const config = {
  databaseUrl: req('DATABASE_URL'),
  redisUrl: req('REDIS_URL'),
  apiPort: Number(process.env.API_PORT ?? 3000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  isTest: process.env.NODE_ENV === 'test' || !!process.env.BUN_TEST,
  // `Secure` on the session cookie. Off by default so plain-HTTP local dev works; set
  // COOKIE_SECURE=1 in any TLS deployment. It is read from the environment rather than derived
  // from `X-Forwarded-Proto`, because trusting that header requires knowing the proxy is the only
  // way in — an explicit env var cannot be spoofed by a client.
  cookieSecure: process.env.COOKIE_SECURE === '1',
}
