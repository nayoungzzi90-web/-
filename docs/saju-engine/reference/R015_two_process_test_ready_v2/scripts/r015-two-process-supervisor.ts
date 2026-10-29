/**
 * STAGING ONLY. Usage from the root of isolated Lovable staging repository:
 *   bun scripts/r015-two-process-supervisor.ts
 * No production access or user data. Requires staging server-only environment.
 * Every subprocess is killed in finally. Prints only pass/fail counts and UTC minutes.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { isStagingUrl } from '../src/lib/rate-limit.server';

const token = process.env.R015_STAGING_TEST_TOKEN;
const backend = process.env.SUPABASE_URL;
if (!backend || !isStagingUrl(backend) || !token || token.length < 32 ||
    (process.env.RATE_LIMIT_PEPPER?.length ?? 0) < 32 ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('This test requires the approved staging backend and server-side secrets');
}
const childPath = fileURLToPath(new URL('./r015-two-process-worker.server.ts', import.meta.url));
const ports = [8081, 8082] as const;
let children: ChildProcess[] = [];
const errors: string[] = [];

const start = (port: number): ChildProcess => {
  const child = spawn(process.execPath, [childPath, String(port)], {
    env: { ...process.env, TRUSTED_CLIENT_IP_HEADER: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  // Consume without printing potentially sensitive runtime log lines.
  child.stdout?.on('data', () => {});
  child.stderr?.on('data', () => {});
  child.on('error', () => errors.push('Worker spawn failed'));
  return child;
};
async function healthy(port: number): Promise<boolean> {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) });
    return r.status === 200 && r.headers.get('X-R015-Staging') === 'true';
  } catch { return false; }
}
async function waitReady() {
  for (let i=0; i<50; i++) {
    if (errors.length) throw new Error('Spawn blocked by sandbox');
    if (await Promise.all(ports.map(healthy)).then(v=>v.every(Boolean))) return;
    await sleep(100);
  }
  throw new Error('Two independent loopback server processes could not start');
}
async function awaitFreshMinute(): Promise<string> {
  const s = new Date().getUTCSeconds();
  // Ensure the first request begins near the start of a fresh minute and
  // that phase 2 cannot share phase 1's bucket.
  await sleep((60 - s + 1) * 1000);
  return new Date().toISOString().slice(0,16);
}
async function post(port: number, spoof = false): Promise<number> {
  const h = new Headers({ 'x-r015-test-token': token! });
  if (spoof) h.set('x-forwarded-for', '192.0.2.77');
  const res = await fetch(`http://127.0.0.1:${port}/probe`, {
    method: 'POST', headers: h, redirect: 'manual', signal: AbortSignal.timeout(9000),
  });
  const payload = await res.json() as { allowed?: boolean; reason?: string };
  if (res.headers.get('X-R015-Staging') !== 'true' ||
      res.headers.get('content-type') !== 'application/json' ||
      !([200,429] as number[]).includes(res.status) ||
      (res.status===200 && payload.allowed!==true) ||
      (res.status===429 && (payload.allowed!==false || payload.reason!=='limited'))) {
    throw new Error('Unexpected server response (only staging route can pass)');
  }
  return res.status;
}
async function execute(): Promise<void> {
  children = ports.map(start);
  if (!children[0].pid || !children[1].pid || children[0].pid === children[1].pid) {
    throw new Error('No proof of two distinct OS process IDs');
  }
  await waitReady();
  const m1 = await awaitFreshMinute();
  const series: number[] = [];
  for (let i=0; i<11; i++) series.push(await post(ports[i%2]!,i%3===0));
  if (new Date().toISOString().slice(0,16)!==m1) throw new Error('Phase 1 crossed minute');
  if (series.slice(0,10).some(x=>x!==200) || series[10]!==429) {
    throw new Error('Phase 1 shared quota FAILED');
  }
  console.log(`PASS phase1: 10 accepted, 11th limited, UTC minute ${m1}`);

  const m2 = await awaitFreshMinute();
  const seed: number[] = [];
  for (let i=0;i<9;i++) seed.push(await post(ports[i%2]!));
  const parallel = await Promise.all(Array.from({length:10},(_,i)=>post(ports[i%2]!,i%3===0)));
  if (new Date().toISOString().slice(0,16)!==m2) throw new Error('Phase 2 crossed minute');
  const allowed = parallel.filter(x=>x===200).length;
  const blocked = parallel.filter(x=>x===429).length;
  if (seed.some(x=>x!==200) || allowed!==1 || blocked!==9) {
    throw new Error('Phase 2 atomic quota FAILED');
  }
  console.log(`PASS phase2: 9 seeded, 1/10 accepted, 9/10 limited, UTC minute ${m2}`);
  console.log('PASS: Two distinct loopback OS processes shared one staging quota.');
  console.log('LIMITATION: This is NOT a two-deployed-host test and does NOT establish proxy rewrite trust.');
  console.log('NEXT: Verify only aggregated bucket counts 11 and 19 for the printed UTC minutes using read-only SQL.');
}
try { await execute(); }
catch (e) { console.error('FAILED/BLOCKED:',(e as Error).message); process.exitCode=1; }
finally {
  for(const child of children) child.kill('SIGTERM');
  await sleep(600);
  for(const child of children) if (child.exitCode===null) child.kill('SIGKILL');
}
