import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { BirthForm } from "@/components/BirthForm";
import { Friend, FRIEND_INFO } from "@/components/Friends";
import { Basis } from "@/components/ResultParts";
import { Page } from "@/components/Shell";
import { compat, personFromPreview, type Person } from "@/lib/compat";
import { decodeInvite, encodeInvite } from "@/lib/invite";
import { EL_FRIEND, EL_HANJA, EL_WORD, stemElement } from "@/lib/reading";
import { previewFromBirthInput } from "@/lib/saju-engine";
import { setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/compat")({ component: Compat });

function Side({ p }: { p: Person }) {
  const el = stemElement(p.stem);
  const kind = EL_FRIEND[el];
  return (
    <div className="flex-1 text-center">
      <div
        className="rounded-2xl p-1"
        style={{ background: FRIEND_INFO[kind].tint }}
      >
        <Friend
          kind={kind}
          accessory="sunglasses"
          size={96}
          className="mx-auto"
        />
      </div>
      <p className="font-display mt-1 text-lg">{p.name}</p>
      <p className="text-xs text-[var(--ink-soft)]">
        {FRIEND_INFO[kind].name} · {EL_HANJA[el]} {EL_WORD[el]}
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
    const text = `나랑 오행 케미 볼래꽥? (${mine.name}님의 오행 친구가 기다려요)`;
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

  if (!hydrated || !me || !mine)
    return (
      <Page>
        <p className="p-6 text-center">불러오는 중…</p>
      </Page>
    );

  if (!partner || !res)
    return (
      <Page>
        <section className="px-4 pt-5">
          <h1 className="font-display text-[24px] leading-tight">
            누구랑 궁합을 볼까요꽥?
          </h1>
          <div className="hj-card mt-4 bg-[#d3ead9] p-4">
            <p className="font-display text-lg">친구가 직접 입력하게 하기</p>
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
              링크를 보내면 친구가 자기 정보를 넣고 바로 우리 궁합을 봐요. 친구
              생년월일은 내가 몰라도 돼요.
            </p>
            <button
              type="button"
              onClick={sendLink}
              className="font-display mt-3 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--to)] py-2.5 shadow-[3px_3px_0_var(--line)]"
            >
              친구에게 링크 보내기
            </button>
            {msg && (
              <p role="status" className="mt-2 text-center text-xs font-bold">
                {msg}
              </p>
            )}
          </div>
          <p className="my-4 text-center text-sm font-bold text-[var(--ink-soft)]">
            또는 내가 알고 있다면
          </p>
          <BirthForm
            initial={null}
            nameLabel="상대 이름(별명)"
            submitLabel="우리 궁합 보기"
            onSubmit={(b) => {
              const p = personFromPreview(b.name, previewFromBirthInput(b));
              if (p) setManual(p);
            }}
          />
          <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
            상대 정보는 저장하지 않고 이 화면에서만 계산해요.
          </p>
        </section>
      </Page>
    );

  return (
    <Page>
      <section className="px-4 pt-5 text-center">
        <p className="text-sm font-bold text-[var(--stamp)]">오행 케미 결과</p>
        <div className="mt-3 flex items-center gap-2">
          <Side p={mine} />
          <span
            className="font-display text-3xl text-[var(--stamp)]"
            aria-hidden
          >
            ♥
          </span>
          <Side p={partner} />
        </div>

        <div className="hj-card mt-5 bg-[var(--su)] px-4 pb-4 pt-5 text-left text-[#fffaf0]">
          <p className="text-xs font-bold text-[#cfcbe0]">케미 온도 (재미용)</p>
          <p className="font-display text-[44px] leading-none">{res.temp}°</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-[var(--to)]"
              style={{ width: `${res.temp}%` }}
            />
          </div>
          <p className="font-display mt-3 text-[22px] leading-snug">
            {res.title}
          </p>
          <ul className="mt-2 space-y-1 text-[15px] leading-relaxed text-[#e6e2f3]">
            {res.lines.map((l) => (
              <li key={l}>· {l}</li>
            ))}
          </ul>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-left text-sm">
          <div className="hj-card bg-[#e3f2ea] p-3">
            <p className="font-display text-base">잘 맞는 순간</p>
            <ul className="mt-1 space-y-1">
              {res.good.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
          <div className="hj-card bg-[#fde4e1] p-3">
            <p className="font-display text-base">조심할 순간</p>
            <ul className="mt-1 space-y-1">
              {res.watch.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3 text-left">
          <Basis items={res.basis} />
        </div>

        <button
          type="button"
          onClick={sendLink}
          className="font-display mt-5 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--to)] py-3 shadow-[3px_3px_0_var(--line)]"
        >
          다른 친구에게도 링크 보내기
        </button>
        {msg && (
          <p role="status" className="mt-2 text-xs font-bold">
            {msg}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setManual(null);
            setStore({ invite: null });
          }}
          className="mt-3 text-sm text-[var(--ink-soft)] underline"
        >
          다른 사람과 다시 보기
        </button>
        <Link
          to="/result"
          className="mt-2 block text-sm text-[var(--ink-soft)] underline"
        >
          내 사주 결과로 돌아가기
        </Link>
        <p className="mt-4 text-[11px] leading-relaxed text-[var(--ink-soft)]">
          두 사람의 일간 오행 관계와 부족한 기운을 채워주는지만 보는 재미용
          궁합이에요. 케미 온도는 점수가 아니고 관계의 좋고 나쁨을 판정하지
          않아요.
        </p>
      </section>
    </Page>
  );
}
