import { describe, it, expect } from "vitest";
import { LunarTable } from "kor-lunar";
import {
  serializeBirth,
  deserializeBirth,
  type BirthRowRead,
} from "@/lib/birth-persistence.server";
import { convertLunarToSolar } from "@/lib/lunar-conversion.server";

const base = { name: " 테스트 ", gender: "f", time: "12:00" };
const solar = (o: Record<string, unknown> = {}) => ({
  ...base,
  calendar: "solar",
  leap: false,
  date: "1995-03-21",
  ...o,
});
const lunar = (o: Record<string, unknown> = {}) => ({
  ...base,
  calendar: "lunar",
  leap: false,
  date: "2025-06-01",
  ...o,
});

// 모의 DB: user_id 기준 upsert, created_at 보존
function mockDb() {
  const rows = new Map<string, BirthRowRead & { created_at: string }>();
  let clock = 0;
  return {
    rows,
    save(userId: string, input: unknown) {
      const r = serializeBirth(input);
      if (!r.ok) return r;
      const prev = rows.get(userId);
      rows.set(userId, { ...r.row, created_at: prev?.created_at ?? `t${clock++}` });
      return r;
    },
    load(userId: string) {
      const r = rows.get(userId);
      return r ? deserializeBirth(r) : null;
    },
  };
}

describe("출생정보 저장/불러오기", () => {
  it("양력 저장·재조회 (이름 trim, original=null)", () => {
    const db = mockDb();
    expect(db.save("u1", solar()).ok).toBe(true);
    expect(db.rows.get("u1")).toMatchObject({
      birth_date: "1995-03-21",
      birth_input_original: null,
      calendar: "solar",
      name: "테스트",
    });
    expect(db.load("u1")).toEqual({
      ok: true,
      me: {
        name: "테스트",
        calendar: "solar",
        leap: false,
        date: "1995-03-21",
        time: "12:00",
        gender: "f",
      },
    });
  });

  it("음력 2025 윤6월 1일 → 양력 2025-07-25, 원본 보존", () => {
    const db = mockDb();
    db.save("u1", lunar({ leap: true }));
    expect(db.rows.get("u1")).toMatchObject({
      birth_date: "2025-07-25",
      birth_input_original: "2025-06-01",
      calendar: "lunar",
      leap: true,
    });
    const r = db.load("u1");
    expect(r?.ok && r.me).toMatchObject({ date: "2025-06-01", leap: true, calendar: "lunar" });
  });

  it("음력 2025 평6월 1일 → 2025-06-25", () => {
    const r = serializeBirth(lunar());
    expect(r.ok && r.row).toMatchObject({
      birth_date: "2025-06-25",
      birth_input_original: "2025-06-01",
      leap: false,
    });
  });

  it("음력으로 실존하지만 양력으로 무효인 30일 날짜 저장", () => {
    const has2025_2_30 = LunarTable.getMonthDays(2025, 2) === 30;
    expect(convertLunarToSolar("2025-02-30", false).ok).toBe(has2025_2_30);
    // 실제 30일인 2·4·6·9·11월 탐색
    let found: string | null = null;
    for (let y = 2000; y <= 2025 && !found; y++)
      for (const m of [2, 4, 6, 9, 11])
        if (LunarTable.getMonthDays(y, m) === 30) {
          found = `${y}-${String(m).padStart(2, "0")}-30`;
          break;
        }
    expect(found).not.toBeNull();
    const r = serializeBirth(lunar({ date: found }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.birth_input_original).toBe(found);
    const [y, mo, d] = r.row.birth_date.split("-").map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    expect(dt.getUTCMonth() + 1 === mo && dt.getUTCDate() === d).toBe(true); // DATE 칼럼에 유효
    expect(r.row.birth_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("legacy 음력(original=null)은 birth_date 그대로, 재변환 안 함", () => {
    const row: BirthRowRead = {
      name: "a",
      calendar: "lunar",
      leap: false,
      birth_date: "1990-05-10",
      birth_input_original: null,
      birth_time: null,
      gender: "m",
    };
    const r = deserializeBirth(row);
    expect(r.ok && r.me.date).toBe("1990-05-10");
  });

  it("신규 음력은 original 표시, 형식 오류 original은 오류(추측 금지)", () => {
    const row: BirthRowRead = {
      name: "a",
      calendar: "lunar",
      leap: true,
      birth_date: "2025-07-25",
      birth_input_original: "2025-06-01",
      birth_time: "07:30",
      gender: "f",
    };
    expect(deserializeBirth(row)).toMatchObject({
      ok: true,
      me: { date: "2025-06-01", leap: true },
    });
    expect(deserializeBirth({ ...row, birth_input_original: "2025/6/1" }).ok).toBe(false);
  });

  it("없는 윤달·잘못된 입력은 write 없음", () => {
    const db = mockDb();
    const bad = [
      lunar({ date: "2025-01-01", leap: true }),
      lunar({ leap: "true" }),
      solar({ leap: true }),
      solar({ date: "1995-3-21" }),
      solar({ time: "24:00" }),
      solar({ time: "" }),
      solar({ gender: "x" }),
      solar({ name: "   " }),
      solar({ name: "가".repeat(13) }),
      solar({ calendar: "x" }),
      solar({ date: "1899-12-31" }),
      solar({ date: "2027-01-01" }),
      solar({ date: "1988-10-09", time: "02:30" }), // DST 중복
      solar({ date: "2026-02-04", time: null }), // 시간 미상 절입일
      null,
      [],
      "x",
    ];
    for (const b of bad) expect(db.save("u1", b).ok).toBe(false);
    expect(db.rows.size).toBe(0);
  });

  it("idempotence + created_at 보존 + 사용자 분리", () => {
    const db = mockDb();
    db.save("u1", lunar({ leap: true }));
    const first = { ...db.rows.get("u1")! };
    db.save("u1", lunar({ leap: true }));
    expect(db.rows.get("u1")).toEqual(first);
    db.save("u1", solar());
    expect(db.rows.get("u1")!.created_at).toBe(first.created_at);
    db.save("u2", solar({ date: "2000-01-07" }));
    expect(db.rows.get("u1")!.birth_date).toBe("1995-03-21");
    // 저장→읽기→재저장 왕복 결과 동일
    const me = db.load("u1");
    expect(me?.ok && serializeBirth(me.me)).toEqual(serializeBirth(solar()));
  });
});
