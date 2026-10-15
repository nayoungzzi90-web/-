#!/usr/bin/env node
/**
 * Edge Function 이 쓸 공유 코드를 src/lib 에서 supabase/functions/_shared/lib 로 복사한다.
 * Deno 는 import 에 ".ts" 확장자가 필요하므로 상대 import 를 변환한다. (배포 전 매번 실행; 생성물은 git 에 올리지 않음)
 */
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'src/lib', OUT = 'supabase/functions/_shared/lib';
const files = [
  'catalog.ts', 'kst.ts', 'hash.ts',
  ...['types', 'rules', 'sampleCalculator'].map((f) => `saju/${f}.ts`),
  ...readdirSync(`${SRC}/report`).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => `report/${f}`),
];
rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  const dest = join(OUT, f);
  mkdirSync(dirname(dest), { recursive: true });
  const code = readFileSync(join(SRC, f), 'utf8').replace(/(from\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g, (_, a, p, c) => `${a}${p.endsWith('.ts') ? p : p + '.ts'}${c}`);
  writeFileSync(dest, code);
}
console.log(`synced ${files.length} files → ${OUT}`);
