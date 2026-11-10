import { useState } from "react";
import { parseBirthInput } from "@/lib/saju-engine";
import { SUPPORT_RANGE_LABEL } from "@/lib/support-range";
import type { BirthInput } from "@/lib/saju";

const pad = (n: string) => n.padStart(2, "0");
const box =
  "w-full rounded-xl border-2 border-[var(--line)] bg-[#fffdf5] px-3 py-2.5 text-[16px] outline-none focus:border-[var(--stamp)]";
const choice = (on: boolean) =>
  `rounded-xl border-2 border-[var(--line)] py-2.5 font-extrabold ${on ? "bg-[var(--to)] shadow-[3px_3px_0_var(--line)]" : "bg-[#fffdf5]"}`;

// 생년월일 입력 폼(본인·상대 공용). 검증은 계산 엔진의 파서가 한다.
export function BirthForm({
  initial,
  submitLabel,
  onSubmit,
  nameLabel = "이름(별명)",
}: {
  initial: BirthInput | null;
  submitLabel: string;
  onSubmit: (b: BirthInput) => void;
  nameLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cal, setCal] = useState<"solar" | "lunar">(
    initial?.calendar ?? "solar",
  );
  const [leap, setLeap] = useState(initial?.leap ?? false);
  const [y, setY] = useState(initial?.date.slice(0, 4) ?? "");
  const [m, setM] = useState(
    initial ? String(Number(initial.date.slice(5, 7))) : "",
  );
  const [d, setD] = useState(
    initial ? String(Number(initial.date.slice(8, 10))) : "",
  );
  const [time, setTime] = useState(initial?.time ?? "");
  const [unknownTime, setUnknownTime] = useState(
    initial ? initial.time === null : false,
  );
  const [gender, setGender] = useState<"f" | "m">(initial?.gender ?? "f");
  const [err, setErr] = useState("");

  function submit() {
    setErr("");
    const nm = name.trim();
    if (!nm || nm.length > 10)
      return setErr("이름(별명)을 1~10글자로 적어주세요.");
    if (!unknownTime && !time)
      return setErr("출생 시간을 넣거나 '시간을 몰라요'를 눌러주세요.");
    const input: BirthInput = {
      name: nm,
      calendar: cal,
      leap: cal === "lunar" ? leap : false,
      date: `${y.padStart(4, "0")}-${pad(m)}-${pad(d)}`,
      time: unknownTime ? null : time || null,
      gender,
    };
    const parsed = parseBirthInput(input);
    if (!parsed.ok) return setErr(parsed.error);
    onSubmit(input);
  }
  const clear = () => err && setErr("");

  return (
    <div className="space-y-4" onChange={clear}>
      <label className="block">
        <span className="mb-1 block text-sm font-extrabold">{nameLabel}</span>
        <input
          className={box}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={10}
          placeholder="예: 나영"
        />
      </label>
      <div>
        <span className="mb-1 block text-sm font-extrabold">달력</span>
        <div className="grid grid-cols-2 gap-2">
          {(["solar", "lunar"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCal(c)}
              aria-pressed={cal === c}
              className={choice(cal === c)}
            >
              {c === "solar" ? "양력" : "음력"}
            </button>
          ))}
        </div>
        {cal === "lunar" && (
          <label className="mt-2 flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={leap}
              onChange={(e) => setLeap(e.target.checked)}
              className="h-5 w-5 accent-[var(--stamp)]"
            />
            윤달이에요
          </label>
        )}
      </div>
      <div>
        <span className="mb-1 block text-sm font-extrabold">생년월일</span>
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <input
            className={box}
            inputMode="numeric"
            maxLength={4}
            value={y}
            onChange={(e) => setY(e.target.value.replace(/\D/g, ""))}
            placeholder="1990"
            aria-label="태어난 해"
          />
          <input
            className={box}
            inputMode="numeric"
            maxLength={2}
            value={m}
            onChange={(e) => setM(e.target.value.replace(/\D/g, ""))}
            placeholder="5월"
            aria-label="태어난 달"
          />
          <input
            className={box}
            inputMode="numeric"
            maxLength={2}
            value={d}
            onChange={(e) => setD(e.target.value.replace(/\D/g, ""))}
            placeholder="15일"
            aria-label="태어난 날"
          />
        </div>
        <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
          한국 출생만 계산해요 · {SUPPORT_RANGE_LABEL}년
        </p>
      </div>
      <div>
        <span className="mb-1 block text-sm font-extrabold">태어난 시간</span>
        <input
          className={`${box} disabled:opacity-40`}
          type="time"
          value={time}
          disabled={unknownTime}
          onChange={(e) => setTime(e.target.value)}
          aria-label="태어난 시간"
        />
        <label className="mt-2 flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={unknownTime}
            onChange={(e) => setUnknownTime(e.target.checked)}
            className="h-5 w-5 accent-[var(--stamp)]"
          />
          시간을 몰라요 (시주 없이 6글자로 봐요)
        </label>
      </div>
      <div>
        <span className="mb-1 block text-sm font-extrabold">성별</span>
        <div className="grid grid-cols-2 gap-2">
          {(["f", "m"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              aria-pressed={gender === g}
              className={choice(gender === g)}
            >
              {g === "f" ? "여성" : "남성"}
            </button>
          ))}
        </div>
      </div>
      {err && (
        <p
          role="alert"
          className="rounded-xl border-2 border-[var(--stamp)] bg-[#fde4e1] px-3 py-2 text-sm font-bold text-[var(--stamp)]"
        >
          {err}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        className="font-display w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3.5 text-lg text-white shadow-[4px_4px_0_var(--line)] active:translate-y-0.5"
      >
        {submitLabel}
      </button>
    </div>
  );
}
