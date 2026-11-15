import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { BirthForm } from "@/components/BirthForm";
import { CardArt } from "@/components/ttotto/Art";
import { TtShell } from "@/components/ttotto/TtShell";
import { compat, personFromPreview, type Person } from "@/lib/compat";
import { makeCompatImage } from "@/lib/compat-image";
import { decodeInvite, encodeInvite } from "@/lib/invite";
import { EL_HANJA, EL_WORD, stemElement } from "@/lib/reading";
import { previewFromBirthInput } from "@/lib/saju-engine";
import { setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/compat")({ component: Compat });

function Side({ p }: { p: Person }) {
  const el = stemElement(p.stem);
  return (
    <div className="min-w-0 flex-1 rounded-[16px] border border-[var(--hair)] bg-white px-2 py-2 text-center">
      <p className="truncate text-[19px] font-extrabold leading-tight">{p.name}</p>
      <p className="text-[14px] text-[var(--tt-muted)]">
        {EL_HANJA[el]} {EL_WORD[el]}
      </p>
    </div>
  );
}

function Compat() {
  const nav = useNavigate();
  const { me, invite, hydrated } = useStore();
  const [manual, setManual] = useState<Person | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (hydrated && !me) void nav({ to: "/input" });
  }, [hydrated, me, nav]);

  const mine = useMemo(() => {
    if (!me) return null;
    return personFromPreview(me.name, previewFromBirthInput(me));
  }, [me]);
  const partner = useMemo(
    () => manual ?? (invite ? decodeInvite(invite) : null),
    [manual, invite],
  );
  const res = useMemo(
    () => (mine && partner ? compat(mine, partner) : null),
    [mine, partner],
  );

  async function sendLink() {
    if (!mine) return;
    const url = `${location.origin}/invite?c=${encodeInvite(mine)}`;
    const text = `나랑 오행 케미 볼래요? (${mine.name}님의 오행 친구가 기다려요)`;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setMsg("링크를 복사했어요. 친구에게 붙여넣어 보내요");
      }
    } catch {
      /* 공유 창을 닫은 경우 */
    }
  }

  // 우리 케미 결과를 이미지 카드로 공유한다. 카드에는 이름·생년월일·초대 링크가 들어가지 않는다.
  async function shareCard() {
    if (!res) return;
    const blob = await makeCompatImage(res);
    if (!blob) {
      setMsg("카드를 만들지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
      return;
    }
    const file = new File([blob], "ttotto-compat-card.png", { type: "image/png" });
    const text = `우리 케미 온도 ${res.temp}° (재미용) · 또또사주`;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "우리의 오행 케미", text, files: [file] });
        setMsg("");
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    // 이미지 공유가 안 되는 기기: 이미지를 내려받게 한다.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ttotto-compat-card.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg("카드 이미지를 저장했어요. 친구에게 보내 보세요.");
  }

  if (!hydrated || !me || !mine)
    return (
      <TtShell title="우리 궁합">
        <p className="py-10 text-center text-[17px]">불러오는 중…</p>
      </TtShell>
    );

  if (!partner || !res)
    return (
      <TtShell title="우리 궁합">
        <section className="rounded-[20px] border border-[var(--hair)] bg-[var(--tt-blue)] px-4 pb-4 pt-3 text-center">
          <div className="mx-auto w-[58%]">
            <CardArt id="compatibility" widthPct={100} />
          </div>
          <h1 className="mt-1 text-[clamp(26px,7.6vw,32px)] leading-tight">누구랑 궁합을 볼까?</h1>
          <p className="mt-1 text-[15px] text-[var(--tt-muted)]">친구 생년월일을 몰라도 괜찮아요</p>
        </section>

        <section className="mt-4 rounded-[20px] border border-[var(--hair)] bg-[var(--tt-green)] p-4">
          <h2 className="text-[22px] leading-tight">친구가 직접 입력하게 하기</h2>
          <p className="mt-1 text-[15px] leading-snug text-[#3a312b]">
            링크를 보내면 친구가 자기 정보를 넣고 바로 우리 궁합을 봐요.
          </p>
          <button type="button" onClick={sendLink} className="tt-btn tt-primary mt-3">
            친구에게 링크 보내기
          </button>
          {msg && (
            <p role="status" className="mt-2 text-center text-[14px] font-bold">
              {msg}
            </p>
          )}
        </section>

        <p className="my-4 flex items-center gap-3 text-center text-[15px] font-bold text-[var(--tt-muted)]">
          <span aria-hidden className="h-0 flex-1 border-t-2 border-dotted border-[rgba(27,22,19,.38)]" />
          또는 내가 알고 있다면
          <span aria-hidden className="h-0 flex-1 border-t-2 border-dotted border-[rgba(27,22,19,.38)]" />
        </p>

        <section className="rounded-[20px] border border-[var(--hair)] bg-white p-4">
          <BirthForm
            tone="tt"
            initial={null}
            nameLabel="상대 이름(별명)"
            submitLabel="우리 궁합 보기"
            onSubmit={(b) => {
              const p = personFromPreview(b.name, previewFromBirthInput(b));
              if (p) setManual(p);
            }}
          />
        </section>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-[var(--tt-muted)]">
          상대 정보는 저장하지 않고 이 화면에서만 계산해요.
        </p>
      </TtShell>
    );

  return (
    <TtShell title="우리 궁합">
      <section className="text-center">
        <p className="text-[15px] font-bold text-[var(--tt-orange)]">우리의 오행 케미</p>
        <div className="mx-auto mt-1 w-[62%]">
          <CardArt id="compatibility" widthPct={100} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Side p={mine} />
          <span className="text-[28px] text-[#ff6f45]" aria-hidden>♥</span>
          <Side p={partner} />
        </div>

        <div className="mt-4 rounded-[20px] border border-[var(--hair)] bg-[var(--tt-blue)] px-4 pb-4 pt-4 text-left">
          <p className="text-[14px] font-bold text-[var(--tt-muted)]">케미 온도 (재미용)</p>
          <p className="font-display text-[56px] leading-none">{res.temp}°</p>
          <div className="mt-2 h-[18px] overflow-hidden rounded-full border border-[var(--hair)] bg-white">
            <div className="h-full bg-[#ff6f45]" style={{ width: `${res.temp}%` }} />
          </div>
          <h2 className="mt-3 text-[clamp(22px,6.4vw,26px)] leading-snug">{res.title}</h2>
          <ul className="mt-2 space-y-1.5 text-[16px] leading-relaxed [word-break:keep-all]">
            {res.lines.map((l) => (
              <li key={l}>· {l}</li>
            ))}
          </ul>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-[18px] border border-[var(--hair)] bg-[var(--tt-green)] p-3">
            <p className="font-display text-[19px]">잘 맞는 순간</p>
            <ul className="mt-1 space-y-1 text-[15px] leading-snug">
              {res.good.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[18px] border border-[var(--hair)] bg-[var(--tt-pink)] p-3">
            <p className="font-display text-[19px]">조심할 순간</p>
            <ul className="mt-1 space-y-1 text-[15px] leading-snug">
              {res.watch.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
        </div>

        <details className="mt-3 rounded-[16px] border border-[var(--hair)] bg-white px-3 py-2 text-left">
          <summary className="cursor-pointer text-[16px] font-extrabold">근거 보기</summary>
          <ul className="mt-2 flex flex-wrap gap-1.5 pb-1 text-[14px]">
            {res.basis.map((t) => (
              <li key={t} className="rounded-md border-[1.5px] border-[var(--tt-ink)] bg-[var(--tt-bg)] px-2 py-0.5 font-bold">
                {t}
              </li>
            ))}
          </ul>
        </details>

        <button type="button" onClick={shareCard} className="tt-btn tt-primary mt-5">
          우리 케미 카드 공유하기
        </button>
        <button type="button" onClick={sendLink} className="tt-btn tt-sub mt-3">
          다른 친구에게도 링크 보내기
        </button>
        {msg && (
          <p role="status" className="mt-2 text-[14px] font-bold">
            {msg}
          </p>
        )}
        <div className="mt-4 flex flex-col items-center gap-1 text-[15px] text-[var(--tt-muted)]">
          <button
            type="button"
            onClick={() => {
              setManual(null);
              setStore({ invite: null });
            }}
            className="min-h-[40px] underline"
          >
            다른 사람과 다시 보기
          </button>
          <Link to="/result" className="inline-flex min-h-[40px] items-center underline">
            내 사주 결과로 돌아가기
          </Link>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--tt-muted)]">
          두 사람의 일간 오행 관계와 부족한 기운을 채워주는지만 보는 재미용 궁합이에요. 케미 온도는 점수가 아니고 관계의 좋고 나쁨을 판정하지 않아요.
        </p>
      </section>
    </TtShell>
  );
}
