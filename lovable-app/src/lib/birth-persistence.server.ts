// 회원 출생정보 저장/불러오기 순수 함수 (서버 전용). DB 접근 없음 — 테스트 가능.
import { parseBirthInput, previewFromBirthInput } from "./saju-engine.server";
import type { BirthInput } from "./saju";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface BirthRowWrite {
  name: string;
  calendar: "solar" | "lunar";
  leap: boolean;
  birth_date: string;
  birth_input_original: string | null;
  birth_time: string | null;
  gender: "f" | "m";
}

export interface BirthRowRead {
  name: string;
  calendar: string;
  leap: boolean;
  birth_date: string;
  birth_input_original: string | null;
  birth_time: string | null;
  gender: string;
}

const fail = (error: string) => ({ ok: false as const, error });

/** 사용자 입력 → DB 행. 실패 시 DB write를 하면 안 된다. */
export function serializeBirth(
  input: unknown,
): { ok: true; row: BirthRowWrite } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return fail("입력 형식이 올바르지 않아요.");
  const d = input as Record<string, unknown>;
  const { calendar, leap, date, time, gender } = d;
  if (calendar !== "solar" && calendar !== "lunar")
    return fail("양력/음력 구분이 올바르지 않아요.");
  if (typeof leap !== "boolean") return fail("윤달 값이 올바르지 않아요.");
  if (calendar === "solar" && leap) return fail("양력에는 윤달을 선택할 수 없어요.");
  if (typeof date !== "string" || !DATE_RE.test(date)) return fail("날짜 형식이 올바르지 않아요.");
  if (time !== null && (typeof time !== "string" || !TIME_RE.test(time)))
    return fail("출생 시간 형식이 올바르지 않아요.");
  if (gender !== "f" && gender !== "m") return fail("성별 값이 올바르지 않아요.");
  if (typeof d["name"] !== "string") return fail("이름을 입력해 주세요.");
  const name = d["name"].trim();
  if (!name || [...name].length > 12) return fail("이름은 1~12자로 입력해 주세요.");

  const clean = { name, calendar, leap, date, time, gender };
  const p = parseBirthInput(clean);
  if (!p.ok) return fail(p.error);
  // 범위·DST 모호/소멸·시간 미상 절입일 등 엔진 fail-closed 조건도 저장 전 동일하게 적용
  const preview = previewFromBirthInput(clean);
  if (!preview.ok) return fail(preview.error ?? "계산할 수 없는 입력이에요.");

  if (calendar === "lunar") {
    if (!p.conversion) return fail("음력 변환에 실패했어요.");
    return {
      ok: true,
      row: {
        name,
        calendar,
        leap,
        birth_date: p.conversion.convertedSolarDate,
        birth_input_original: date,
        birth_time: time,
        gender,
      },
    };
  }
  return {
    ok: true,
    row: {
      name,
      calendar,
      leap: false,
      birth_date: date,
      birth_input_original: null,
      birth_time: time,
      gender,
    },
  };
}

/** DB 행 → 화면 입력값. legacy 음력(original=null)은 birth_date를 원래 음력 입력으로 그대로 사용(재변환 금지). */
export function deserializeBirth(
  r: BirthRowRead,
): { ok: true; me: BirthInput } | { ok: false; error: string } {
  const calendar = r.calendar === "lunar" ? "lunar" : r.calendar === "solar" ? "solar" : null;
  if (!calendar) return fail("저장된 출생정보 형식이 올바르지 않아요.");
  let date: string;
  if (calendar === "lunar" && r.birth_input_original !== null) {
    if (!DATE_RE.test(r.birth_input_original))
      return fail("저장된 음력 원본 날짜 형식이 올바르지 않아요. 다시 입력해 주세요.");
    date = r.birth_input_original;
  } else {
    date = r.birth_date;
  }
  return {
    ok: true,
    me: {
      name: r.name,
      calendar,
      leap: calendar === "lunar" ? r.leap : false,
      date,
      time: r.birth_time,
      gender: r.gender === "m" ? "m" : "f",
    },
  };
}
