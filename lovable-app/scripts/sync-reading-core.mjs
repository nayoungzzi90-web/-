#!/usr/bin/env node
// 풀이 작성 로직(만세력 엔진 + 해석 작성기)을 상위 저장소(../)에서 src/lib/reading-core/ 로 그대로 복사한다.
// - 상대 경로 구조를 유지하므로 import 를 고치지 않아도 된다(byte-identical, .ts 는 맨 위에 @ts-nocheck 머리말만 추가).
// - 이 폴더는 직접 고치지 않는다. 원본(../engine/manse, ../src/lib/...)을 고친 뒤 이 스크립트를 다시 실행한다.
// 사용: node scripts/sync-reading-core.mjs          (복사)
//       node scripts/sync-reading-core.mjs --check  (원본과 달라졌는지 검사, 다르면 종료 코드 1)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(HERE, "..", ".."); // 상위 저장소 루트
const OUT = join(HERE, "..", "src", "lib", "reading-core");

export const FILES = [
  "engine/manse/data/new_moons.json",
  "engine/manse/data/solar_terms.runtime.json",
  ...[
    "adapter",
    "config",
    "engine",
    "errors",
    "ganji",
    "hidden",
    "luck",
    "lunar",
    "official",
    "pillars",
    "relations",
    "solarTime",
    "tenGods",
    "terms",
    "time",
    "zone",
  ].map((f) => `engine/manse/src/${f}.ts`),
  "src/lib/catalog.ts",
  "src/lib/hash.ts",
  ...[
    "characters",
    "chat",
    "concern",
    "reading",
    "readingBank",
    "readingBank2",
    "readingBank3",
    "report",
  ].map((f) => `src/lib/content/${f}.ts`),
  "src/lib/report/analysis.ts",
  ...["calculator", "rules", "types"].map((f) => `src/lib/saju/${f}.ts`),
];
export const HEADER =
  "// @ts-nocheck\n// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.\n";

export function expected(rel) {
  const text = readFileSync(join(SRC_ROOT, rel), "utf8");
  return rel.endsWith(".ts") ? HEADER + text : text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  let bad = 0;
  for (const rel of FILES) {
    const dest = join(OUT, rel);
    const want = expected(rel);
    if (check) {
      if (!existsSync(dest) || readFileSync(dest, "utf8") !== want) {
        console.error(`다름: ${rel}`);
        bad++;
      }
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, want);
    }
  }
  if (check) {
    console.log(
      bad
        ? `${bad}개 파일이 원본과 달라요. node scripts/sync-reading-core.mjs 를 실행하세요.`
        : `원본과 동일 (${FILES.length}개)`,
    );
    process.exit(bad ? 1 : 0);
  }
  console.log(`복사 완료 (${FILES.length}개) → ${OUT}`);
}
