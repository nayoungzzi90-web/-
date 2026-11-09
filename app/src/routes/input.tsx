import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Friend } from "@/components/Friends";
import { Page } from "@/components/Shell";
import { parseBirthInput } from "@/lib/saju-engine";
import { SUPPORT_RANGE_LABEL } from "@/lib/support-range";
import type { BirthInput } from "@/lib/saju";
import { setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/input")({ component: InputPage });

const pad = (n: string) => n.padStart(2, "0");
const box =
  "w-full rounded-xl border-2 border-[var(--line)] bg-[#fffdf5] px-3 py-2.5 text-[16px] outline-none focus:border-[var(--stamp)]";

function InputPage() {
  const nav = useNavigate();
  const { me } = useStore();
  const [name, setName] = useState(me?.name ?? "");
  const [cal, setCal] = useState<"solar" | "lunar">(me?.calendar ?? "solar");
  const [leap, setLeap] = useState(me?.leap ?? false);
  const [y, setY] = useState(me?.date.slice(0, 4) ?? "");
  const [m, setM] = useState(me ? String(Number(me.date.slice(5, 7))) : "");
  const [d, setD] = useState(me ? String(Number(me.date.slice(8, 10))) : "");
  const [time, setTime] = useState(me?.time ?? "");
  const [unknownTime, setUnknownTime] = useState(me ? me.time === null : false);
  const [gender, setGender] = useState<"f" | "m">(me?.gender ?? "f");
  const [err, setErr] = useState("");

  function submit() {
    setErr("");
    const nm = name.trim();
    if (!nm || nm.length > 10)
      return setErr("이름(별명)을 1~10글자로 적어주세요.");
    const input: BirthInput = {
      name: nm,
      calendar: cal,
      leap: cal === "lunar" ? leap : false,
      date: `${y.padStart(4, "0")}-${pad(m)}-${pad(d)}`,
      time: unknownTime ? null : time || null,
      gender,
    };
    if (!unknownTime && !time)
      return setErr("출생 시간을 넣거나 '시간을 몰라요'를 눌러주세요.");
    const parsed = parseBirthInput(input);
    if (!parsed.ok) return setErr(parsed.error);
    setStore({ me: input });
    void nav({ to: "/concern" });
  }

  return (
    <Page>
      <section className="px-4 pt-5">
        <div className="flex items-end gap-3">
          <Friend
            kind="seonbi"
            accessory="sunglasses"
            size={92}
            className="bob shrink-0"
          />
          <div className="hj-card relative flex-1 bg-[#fffaf0] px-3.5 py-3">
            <p className="font-display text-lg leading-snug">
              생년월일을 알려주면 내 오행 친구를 찾아줄게꽥!
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-extrabold">
              이름(별명)
            </span>
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
                  className={`rounded-xl border-2 border-[var(--line)] py-2.5 font-extrabold ${cal === c ? "bg-[var(--to)] shadow-[3px_3px_0_var(--line)]" : "bg-[#fffdf5]"}`}
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
            <span className="mb-1 block text-sm font-extrabold">
              태어난 시간
            </span>
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
                  className={`rounded-xl border-2 border-[var(--line)] py-2.5 font-extrabold ${gender === g ? "bg-[var(--to)] shadow-[3px_3px_0_var(--line)]" : "bg-[#fffdf5]"}`}
                >
                  {g === "f" ? "여성" : "남성"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {err && (
          <p
            role="alert"
            className="mt-4 rounded-xl border-2 border-[var(--stamp)] bg-[#fde4e1] px-3 py-2 text-sm font-bold text-[var(--stamp)]"
          >
            {err}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          className="font-display mt-5 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3.5 text-lg text-white shadow-[4px_4px_0_var(--line)] active:translate-y-0.5"
        >
          다음: 요즘 고민 적기
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
          입력한 정보는 이 기기 안에만 저장돼요. 서버로 보내지 않아요.
        </p>
      </section>
    </Page>
  );
}
