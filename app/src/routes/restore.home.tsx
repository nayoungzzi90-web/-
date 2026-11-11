import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FriendImg,
  MhButton,
  MhField,
  MhTabBar,
  MhToggle,
  CoinBadge,
} from "@/components/minhwa/ui";
import { Cloud } from "@/components/minhwa/Scene";
import { ORDER } from "@/components/minhwa/data";
import { parseBirthInput } from "@/lib/saju-engine";
import type { BirthInput } from "@/lib/saju";
import { setStore } from "@/lib/store";

// 시안 ② 홈(입력) 화면 복원. 아직 운영 흐름과 분리된 비교용 주소이며, 입력하면 실제 계산 엔진으로 /restore/result 를 보여준다.
export const Route = createFileRoute("/restore/home")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "시안 복원 · 홈" },
    ],
  }),
  component: RestoreHome,
});

function RestoreHome() {
  const nav = useNavigate();
  const [date, setDate] = useState("");
  const [cal, setCal] = useState<"solar" | "lunar">("solar");
  const [gender, setGender] = useState<"f" | "m">("f");
  const [time, setTime] = useState("");
  const [err, setErr] = useState("");

  function go() {
    setErr("");
    const input: BirthInput = {
      name: "나",
      calendar: cal,
      leap: false,
      date,
      time: time || null,
      gender,
    };
    const p = parseBirthInput(input);
    if (!p.ok) return setErr(p.error);
    setStore({ me: input });
    void nav({ to: "/restore/result" });
  }

  return (
    <div className="skin-minhwa mh-paper min-h-screen pb-28">
      <div className="mx-auto max-w-md">
        <div className="relative overflow-hidden px-5 pt-6">
          <div className="pointer-events-none absolute -right-2 top-0 opacity-90">
            <svg width="130" height="60" viewBox="0 0 130 60" aria-hidden>
              <Cloud x={10} y={8} s={1.4} />
            </svg>
          </div>
          <div className="flex items-start justify-between">
            <p className="mh-title text-[17px] text-[var(--mh-red)]">
              [서비스 이름]
            </p>
            <CoinBadge count={0} />
          </div>
          <h1 className="mh-title mt-2 text-[34px] leading-[1.18]">
            태어난 순간의 이야기,
            <br />
            귀엽게 풀어드려요
          </h1>
          <p className="mt-2 text-[15px] text-[var(--mh-ink-soft)]">
            생년월일만 넣으면 무료 원국 풀이를 바로 볼 수 있어요.
          </p>
        </div>

        {/* 캐릭터 5명이 입력 박스 위에 나란히 선다 */}
        <div className="relative z-10 -mb-5 mt-3 flex items-end justify-center px-3">
          {ORDER.map((k) => (
            <div key={k} className="-mx-1 flex-1">
              <FriendImg kind={k} height={86} />
            </div>
          ))}
        </div>

        <section
          className="relative mx-3 rounded-[22px] border-2 bg-[var(--mh-card)] px-5 pb-6 pt-8 shadow-[0_3px_0_rgba(160,120,70,0.25)]"
          style={{ borderColor: "#c9a76e" }}
        >
          <div className="space-y-4">
            <MhField
              label="생년월일"
              value={date}
              onChange={setDate}
              placeholder="예: 1990-01-01"
              icon="calendar"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <MhToggle
                  options={[
                    { value: "solar", label: "양력" },
                    { value: "lunar", label: "음력" },
                  ]}
                  value={cal}
                  onChange={setCal}
                />
              </div>
              <div className="flex-1">
                <MhToggle
                  options={[
                    { value: "f", label: "여" },
                    { value: "m", label: "남" },
                  ]}
                  value={gender}
                  onChange={setGender}
                  activeColors={{
                    f: "var(--mh-indigo)",
                    m: "var(--mh-indigo)",
                  }}
                />
              </div>
            </div>
            <MhField
              label="태어난 시간"
              value={time}
              onChange={setTime}
              type="time"
              icon="clock"
            />
            <p className="text-[12px] text-[var(--mh-ink-soft)]">
              시간을 모르면 비워 두세요. 시주 없이 6글자로 봐요. 한국 출생만
              계산해요(1900~2050).
            </p>
            {err && (
              <p
                role="alert"
                className="rounded-xl border-2 border-[var(--mh-red)] bg-[#fde4e1] px-3 py-2 text-sm font-bold text-[var(--mh-red)]"
              >
                {err}
              </p>
            )}
            <MhButton onClick={go}>무료로 내 사주 보기</MhButton>
          </div>
        </section>
      </div>
      <MhTabBar active="home" />
    </div>
  );
}
