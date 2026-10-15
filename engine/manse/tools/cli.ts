// JSON 입출력 CLI.  사용: echo '{"calendar":"solar","year":1990,"month":4,"day":19,"hour":1,"minute":10,"gender":"F"}' | npx tsx engine/manse/tools/cli.ts [정책JSON]
import { readFileSync } from 'node:fs';
import { calculate } from '../src/engine';
import { toSajuFacts } from '../src/adapter';

const input = JSON.parse(readFileSync(0, 'utf8'));
const policy = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const r = calculate(input.request ?? input, policy);
if (!r.ok) { console.log(JSON.stringify({ ok: false, error: r.error }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ ok: true, result: r.value, sajuFacts: toSajuFacts(r.value) }, null, 2));
