import { useState } from "react";
import { isLunarDateFormat, isValidDate, type BirthInput } from "@/lib/saju";

const field = "mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-base";
const pad = (n: number) => String(n).padStart(2, "0");
const YEARS = Array.from({ length: 2026 - 1899 + 1 }, (_, i) => 2026 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

export function BirthForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: BirthInput | null;
  submitLabel: string;
  onSubmit: (b: BirthInput) => void | Promise<void>;
}) {
  const [b, setB] = useState<BirthInput>(
    initial ?? { name: "", calendar: "solar", leap: false, date: "", time: "", gender: "f" },
  );
  const [unknown, setUnknown] = useState(initial ? initial.time === null : false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // 음력 날짜는 JS Date로 검증하지 않고 숫자 세 칸으로만 받는다 (실존 여부는 서버 변환에서 판단)
  const [ly, lm, ld] = (b.calendar === "lunar" ? b.date.split("-") : ["", "", ""]) as [
    string?,
    string?,
    string?,
  ];
  const setLunar = (y: string, m: string, d: string) =>
    setB({ ...b, date: y && m && d ? `${y}-${m}-${d}` : `${y}-${m}-${d}` });
  return (
    <form
      className="card-hanji space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!b.name.trim()) return setErr("이름(별명)을 입력해 주세요.");
        if (b.calendar === "solar" && !isValidDate(b.date))
          return setErr("올바른 생년월일을 입력해 주세요 (1900~2026).");
        if (b.calendar === "lunar" && !isLunarDateFormat(b.date))
          return setErr("음력 연·월·일을 모두 선택해 주세요.");
        if (!unknown && !b.time)
          return setErr("출생 시간을 입력하거나 '시간 모름'을 선택해 주세요.");
        if (busy) return;
        setErr("");
        setBusy(true);
        Promise.resolve(
          onSubmit({
            ...b,
            name: b.name.trim(),
            leap: b.calendar === "lunar" ? b.leap : false,
            time: unknown ? null : b.time,
          }),
        ).finally(() => setBusy(false));
      }}
    >
      <label className="block text-sm font-bold">
        이름 또는 별명
        <input
          className={field}
          value={b.name}
          maxLength={12}
          onChange={(e) => setB({ ...b, name: e.target.value })}
        />
      </label>
      <fieldset>
        <legend className="text-sm font-bold">달력</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["solar", "lunar"] as const).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => c !== b.calendar && setB({ ...b, calendar: c, leap: false, date: "" })}
              className={`rounded-xl border py-2 text-sm ${b.calendar === c ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"}`}
            >
              {c === "solar" ? "양력" : "음력"}
            </button>
          ))}
        </div>
      </fieldset>
      {b.calendar === "solar" ? (
        <label className="block text-sm font-bold">
          생년월일 (양력)
          <input
            type="date"
            className={field}
            value={b.date}
            min="1900-01-01"
            max="2026-12-31"
            onChange={(e) => setB({ ...b, date: e.target.value })}
          />
        </label>
      ) : (
        <fieldset>
          <legend className="text-sm font-bold">생년월일 (음력)</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <select
              aria-label="음력 연도"
              className={field}
              value={ly ?? ""}
              onChange={(e) => setLunar(e.target.value, lm ?? "", ld ?? "")}
            >
              <option value="">연도</option>
              {YEARS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              aria-label="음력 월"
              className={field}
              value={lm ?? ""}
              onChange={(e) => setLunar(ly ?? "", e.target.value, ld ?? "")}
            >
              <option value="">월</option>
              {MONTHS.map((m) => (
                <option key={m} value={pad(m)}>
                  {m}월
                </option>
              ))}
            </select>
            <select
              aria-label="음력 일"
              className={field}
              value={ld ?? ""}
              onChange={(e) => setLunar(ly ?? "", lm ?? "", e.target.value)}
            >
              <option value="">일</option>
              {DAYS.map((d) => (
                <option key={d} value={pad(d)}>
                  {d}일
                </option>
              ))}
            </select>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={b.leap}
              onChange={(e) => setB({ ...b, leap: e.target.checked })}
            />
            윤달
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            윤달 출생이 확실할 때만 체크하세요. 음력 월·일(29일/30일, 윤달 존재 여부)은 서버에서
            양력으로 변환하며 확인해요.
          </p>
        </fieldset>
      )}
      <div>
        <label className="block text-sm font-bold">
          출생 시간 (한국 기준)
          <input
            type="time"
            className={field}
            disabled={unknown}
            value={b.time ?? ""}
            onChange={(e) => setB({ ...b, time: e.target.value })}
          />
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} />
          시간 모름 (시주 없이 풀이)
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-bold">성별</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["f", "m"] as const).map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => setB({ ...b, gender: g })}
              className={`rounded-xl border py-2 text-sm ${b.gender === g ? "border-secondary bg-secondary text-secondary-foreground" : "border-input bg-card"}`}
            >
              {g === "f" ? "여성" : "남성"}
            </button>
          ))}
        </div>
      </fieldset>
      {err && (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      )}
      <button
        disabled={busy}
        aria-busy={busy}
        className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "저장 중…" : submitLabel}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        로그인하면 입력 정보가 회원정보에 저장돼요. 저장에 실패하면 이 화면에서 다시 시도할 수
        있어요.
      </p>
    </form>
  );
}
