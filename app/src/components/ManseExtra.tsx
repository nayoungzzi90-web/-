import { useMemo, type ReactNode } from "react";
import { EL_BG, EL_FG } from "@/components/ResultParts";
import { computeDaeun } from "@/lib/daeun";
import { hiddenStemsOf, mainStemOf } from "@/lib/hidden-stems";
import { EL_WORD, stemElement } from "@/lib/reading";
import { parseBirthInput } from "@/lib/saju-engine";
import { kstToday, type BirthInput, type Pillar } from "@/lib/saju";
import { TEN_GOD_NOTE, tenGodOf, type TenGod } from "@/lib/ten-gods";

const HAN = "甲乙丙丁戊己庚辛壬癸";
type Pillars = { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };

// 만세력 표와 같은 순서(시·일·월·연)
function columns(p: Pillars) {
  return [
    { label: "시주", p: p.hour, me: false },
    { label: "일주", p: p.day, me: true },
    { label: "월주", p: p.month, me: false },
    { label: "연주", p: p.year, me: false },
  ];
}

function Ref({
  title,
  badge,
  note,
  children,
}: {
  title: string;
  badge: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <details className="hj-card group mt-3 overflow-hidden bg-[#fffaf0]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3">
        <span className="font-display flex-1 text-[17px]">{title}</span>
        <span className="rounded-md border-[1.5px] border-[var(--stamp)] px-1.5 py-0.5 text-[11px] font-extrabold text-[var(--stamp)]">
          {badge}
        </span>
        <span className="text-xl transition-transform group-open:rotate-180" aria-hidden>
          ⌄
        </span>
      </summary>
      <div className="px-3 pb-4">
        <p className="mb-3 rounded-lg bg-[#f3e6c8] px-3 py-2 text-[12px] leading-relaxed">
          {note}
        </p>
        {children}
      </div>
    </details>
  );
}

function StemChip({ stem, small }: { stem: number; small?: boolean }) {
  const el = stemElement(stem);
  return (
    <span
      className={`font-display inline-flex items-center justify-center rounded-md border border-[var(--line)] ${small ? "h-7 w-7 text-[16px]" : "h-10 w-10 text-[24px]"}`}
      style={{ background: EL_BG[el], color: EL_FG[el] }}
    >
      {HAN[stem]}
    </span>
  );
}

function Legend({ names }: { names: TenGod[] }) {
  const uniq = [...new Set(names)];
  return (
    <ul className="mt-3 space-y-0.5 text-[12px] leading-snug text-[var(--ink-soft)]">
      {uniq.map((n) => (
        <li key={n}>
          <b className="text-[var(--ink)]">{n}</b> — {TEN_GOD_NOTE[n]}
        </li>
      ))}
    </ul>
  );
}

const age = (a: { years: number; months: number }) =>
  a.months > 0 ? `${a.years}세 ${a.months}개월` : `${a.years}세`;

export function ManseExtra({ me, pillars }: { me: BirthInput; pillars: Pillars }) {
  const dm = pillars.day.stem;
  const cols = columns(pillars);

  const daeun = useMemo(() => {
    const parsed = parseBirthInput(me, { today: kstToday() });
    if (!parsed.ok) return null;
    return computeDaeun(parsed.parsed, me.gender);
  }, [me]);
  // 현재 나이(만, 소수): 출생 순간부터 지금까지
  const nowAge = daeun ? (Date.now() - daeun.birthUtcMs) / (365.2425 * 86_400_000) : -1;

  const shown: TenGod[] = [];
  const stemRow = cols.map((c) => {
    if (!c.p) return null;
    if (c.me) return "일간";
    const g = tenGodOf(dm, c.p.stem);
    shown.push(g);
    return g;
  });
  const branchRow = cols.map((c) => {
    if (!c.p) return null;
    const g = tenGodOf(dm, mainStemOf(c.p.branch));
    shown.push(g);
    return g;
  });

  return (
    <section aria-label="만세력 참고 표" className="mt-2">
      <Ref
        title="십성 표"
        badge="참고"
        note="일간(나)을 기준으로 다른 글자가 어떤 오행 관계인지 이름을 붙인 표예요. 이름은 계산 공식으로 정해지지만, 그 이름이 무엇을 뜻하는지의 풀이는 전문가 검증 전이라 풀이 문장에는 쓰지 않았어요."
      >
        <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-bold">
          {cols.map((c) => (
            <p key={c.label} className={`rounded-md py-1 ${c.me ? "bg-[var(--to)]" : "bg-[var(--paper-2)]"}`}>
              {c.label}
            </p>
          ))}
          {cols.map((c, i) => (
            <div key={c.label + "s"} className="rounded-lg border border-[#c9a76e] bg-white py-2">
              {c.p ? (
                <>
                  <StemChip stem={c.p.stem} small />
                  <p className="mt-1 text-[13px]">{stemRow[i]}</p>
                  <p className="text-[10px] font-normal text-[var(--ink-soft)]">천간</p>
                </>
              ) : (
                <p className="py-3 text-[11px] font-normal text-[var(--ink-soft)]">시간 모름</p>
              )}
            </div>
          ))}
          {cols.map((c, i) => (
            <div key={c.label + "b"} className="rounded-lg border border-[#c9a76e] bg-white py-2">
              {c.p ? (
                <>
                  <StemChip stem={mainStemOf(c.p.branch)} small />
                  <p className="mt-1 text-[13px]">{branchRow[i]}</p>
                  <p className="text-[10px] font-normal text-[var(--ink-soft)]">지지 본기</p>
                </>
              ) : (
                <p className="py-3 text-[11px] font-normal text-[var(--ink-soft)]">—</p>
              )}
            </div>
          ))}
        </div>
        <Legend names={shown} />
      </Ref>

      <Ref
        title="지장간 표"
        badge="연해자평 기준 · 참고"
        note="지지 속에 숨어 있는 천간이에요. 이 프로젝트의 규칙 원문(R-003, 《연해자평》)을 따랐고, 전문가 검증 전이에요. 원문은 나열 순서가 월령 분일 순서가 아니라고 해서 ‘본기’와 ‘함께 있는 글자’로만 나눴어요. 다른 책이나 프로그램과 표가 다를 수 있어요."
      >
        <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-bold">
          {cols.map((c) => (
            <p key={c.label} className={`rounded-md py-1 ${c.me ? "bg-[var(--to)]" : "bg-[var(--paper-2)]"}`}>
              {c.label}
            </p>
          ))}
          {cols.map((c) => (
            <div key={c.label + "h"} className="rounded-lg border border-[#c9a76e] bg-white py-2">
              {c.p ? (
                <ul className="flex flex-col items-center gap-1.5">
                  {hiddenStemsOf(c.p.branch).map((h) => (
                    <li key={h.stem} className="flex flex-col items-center">
                      <StemChip stem={h.stem} small />
                      <span className="mt-0.5 text-[10px] font-normal text-[var(--ink-soft)]">
                        {h.main ? "본기 · " : ""}
                        {tenGodOf(dm, h.stem)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-[11px] font-normal text-[var(--ink-soft)]">시간 모름</p>
              )}
            </div>
          ))}
        </div>
      </Ref>

      {daeun && (
        <Ref
          title="대운 표"
          badge="참고용"
          note={`10년 단위로 바뀌는 큰 흐름을 간지로 나눈 표예요. ${daeun.rule}. 시작 나이는 출생과 ${daeun.anchorName} 절입 사이 날수 ÷ 3으로 셌어요(3일 = 1년). 계산 정책은 전문가 승인 전이라 참고만 해 주세요.${daeun.timeKnown ? "" : " 출생 시간을 몰라 정오로 가정했어요. 시작 나이가 달라질 수 있어요."}`}
        >
          <p className="mb-2 text-center text-sm">
            대운 시작 <b>만 {age(daeun.startAge)}</b> ·{" "}
            {daeun.forward ? "순행" : "역행"}
          </p>
          <ol className="grid grid-cols-5 gap-1.5 text-center">
            {daeun.pillars.map((p) => {
              const active = nowAge >= p.startAgeYears && nowAge < p.startAgeYears + 10;
              const el = stemElement(p.stem);
              return (
                <li
                  key={p.order}
                  className={`rounded-lg border bg-white py-1.5 ${active ? "border-[3px] border-[var(--stamp)]" : "border-[#c9a76e]"}`}
                >
                  <p className="text-[10px] text-[var(--ink-soft)]">만 {p.startAge.years}세</p>
                  <p
                    className="font-display mx-auto mt-0.5 w-fit rounded px-1 text-[18px] leading-tight"
                    style={{ background: EL_BG[el], color: EL_FG[el] }}
                  >
                    {p.hanja}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold">{p.tenGod}</p>
                  <p className="text-[10px] text-[var(--ink-soft)]">{p.startYear}년~</p>
                  {active && <p className="text-[10px] font-extrabold text-[var(--stamp)]">지금</p>}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[11px] leading-snug text-[var(--ink-soft)]">
            칸 안의 {EL_WORD[stemElement(dm)]}(일간) 기준 십성 이름은 천간만 본 거예요.
          </p>
        </Ref>
      )}
    </section>
  );
}
