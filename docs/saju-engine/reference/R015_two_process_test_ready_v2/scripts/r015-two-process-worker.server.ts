/**
 * STAGING ONLY. Run with Bun inside the isolated R015 Lovable repository.
 * This is a separate loopback-only OS process, NOT an app deployment.
 * No credentials, IPs, hashes or raw request headers are logged.
 */
import { createServer } from 'node:http';
import { checkRateLimit, isStagingUrl, tokenMatches } from '../src/lib/rate-limit.server';
import { supabaseAdmin } from '../src/integrations/supabase/client.server';

const STAGING_REF = 'ewuiedtpnhmkzdohwdji';
const port = Number(process.argv[2]);
const token = process.env.R015_STAGING_TEST_TOKEN;
const pepper = process.env.RATE_LIMIT_PEPPER;
const backend = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!Number.isInteger(port) || ![8081, 8082].includes(port)) throw new Error('Invalid loopback port');
if (!backend || !isStagingUrl(backend) || !new URL(backend).hostname.startsWith(STAGING_REF + '.')) throw new Error('Not the approved staging backend');
if (!token || token.length < 32 || !pepper || pepper.length < 32 || !serviceKey) throw new Error('Missing required staging-only server secrets');

const json = (res: import('node:http').ServerResponse, status: number, body: Record<string, unknown>) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'X-R015-Staging': 'true',
  });
  res.end(JSON.stringify(body));
};

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    json(res, 200, { ready: true });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/probe') {
    json(res, 404, { error: 'not_found' });
    return;
  }
  const providedToken = req.headers['x-r015-test-token'];
  if (typeof providedToken !== 'string' || !tokenMatches(providedToken, token)) {
    json(res, 403, { allowed: false, reason: 'forbidden' });
    return;
  }
  // Bounded body consumption avoids buffering attacker-controlled input.
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += Buffer.byteLength(chunk);
    if (totalBytes > 1024) {
      json(res, 413, { allowed: false, reason: 'too_large' });
      return;
    }
  }
  // Important: trusted IP header is deliberately NOT forwarded from env.
  const decision = await checkRateLimit(new Headers(), {
    SUPABASE_URL: backend,
    RATE_LIMIT_PEPPER: pepper,
    TRUSTED_CLIENT_IP_HEADER: undefined,
  }, async args => {
    const { data, error } = await supabaseAdmin.rpc('saju_rate_limit_hit', args);
    return { data, error };
  });
  json(res, decision.status, decision.allowed ? { allowed: true } : {
    allowed: false, reason: decision.reason,
  });
});

server.listen(port, '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
