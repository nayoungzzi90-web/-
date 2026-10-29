import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error mjs 스크립트에는 타입 선언이 없다
import { FILES, expected } from "../../scripts/sync-reading-core.mjs";
import { readFileSync } from "node:fs";

// reading-core 는 상위 저장소의 복사본이다. 원본이 바뀌었는데 복사를 안 했으면(또는 복사본을 직접 고쳤으면) 여기서 걸린다.
// 상위 저장소가 없는 환경(Lovable 단독 저장소)에서는 원본 비교를 건너뛰고 파일 존재만 확인한다.
const OUT = join(process.cwd(), "src", "lib", "reading-core");
const hasUpstream = existsSync(join(process.cwd(), "..", "engine", "manse", "src", "engine.ts"));

describe("reading-core 복사본", () => {
  it("필요한 파일이 모두 있다", () => {
    for (const rel of FILES as string[]) expect(existsSync(join(OUT, rel)), rel).toBe(true);
  });
  it.skipIf(!hasUpstream)("원본(상위 저장소)과 정확히 같다", () => {
    for (const rel of FILES as string[])
      expect(readFileSync(join(OUT, rel), "utf8") === expected(rel), rel).toBe(true);
  });
});
