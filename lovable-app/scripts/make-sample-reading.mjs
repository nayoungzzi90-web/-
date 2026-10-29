#!/usr/bin/env node
// docs/samples/basic-1995517.md(AI 샘플)를 예시 풀이 화면용 데이터(src/lib/sample-reading.ts)로 바꾼다: 앞 3개 섹션만 본문.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const text = readFileSync(
  join(HERE, "..", "..", "docs", "samples", "basic-1995517.md"),
  "utf8",
).trim();
const secs = text.split(/\n(?=## )/).map((blk) => {
  const m = blk.match(/^## ([^\n]+)\n### ([^\n]+)\n\n([\s\S]*)$/);
  if (!m) throw new Error(`형식 오류: ${blk.slice(0, 30)}`);
  return { title: m[1].trim(), headline: m[2].trim(), body: m[3].trim() };
});
const out = secs.map((s, i) => {
  if (i < 3)
    return { id: `s${i + 1}`, title: s.title, headline: s.headline, locked: false, body: s.body };
  const t = s.body.replace(/\s+/g, " ");
  return {
    id: `s${i + 1}`,
    title: s.title,
    headline: s.headline,
    locked: true,
    teaser: t.length <= 36 ? t : `${t.slice(0, 36)}…`,
  };
});
const ts = `// 예시 풀이(가상의 인물). 마케팅용 고정 데이터: 앞 3개 섹션만 본문, 나머지는 제목과 미리보기만 담는다.
// scripts/make-sample-reading.mjs 로 docs/samples/basic-1995517.md 에서 만든다(한자 없음). 공개 전 검수 필요(해석 명제 승인 전 AI 초안).
import type { OutSection } from "@/lib/reading.server";

export const SAMPLE_NAME = "하늘";
export const SAMPLE_SECTIONS: OutSection[] = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(join(HERE, "..", "src", "lib", "sample-reading.ts"), ts);
console.log(out.map((o) => `${o.title}:${o.locked ? "잠김" : o.body.length}`).join(" "));
