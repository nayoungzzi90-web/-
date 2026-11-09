import { createFileRoute } from "@tanstack/react-router";
import { Friend } from "@/components/Friends";
import { Page } from "@/components/Shell";

export const Route = createFileRoute("/result")({ component: Result });

// 시안: 결과 화면. 아래 데이터는 예시이며 실제 연결 때는 계산 엔진 결과로 바뀐다.
type El = "목" | "화" | "토" | "금" | "수";
const EL_BG: Record<El, string> = {
  목: "#3b8f7b",
  화: "#d6463a",
  토: "#e8b23a",
  금: "#ece8df",
  수: "#2f3150",
};
const EL_FG: Record<El, string> = {
  목: "#fff",
  화: "#fff",
  토: "#2b2233",
  금: "#2b2233",
  수: "#fff",
};
const EL_WORD: Record<El, string> = {
  목: "나무",
  화: "불",
  토: "흙",
  금: "쇠",
  수: "물",
};

const COLS: {
  label: string;
  me?: boolean;
  stem: [string, string, El];
  branch: [string, string, El];
}[] = [
  { label: "시주", stem: ["癸", "계", "수"], branch: ["未", "미", "토"] },
  {
    label: "일주",
    me: true,
    stem: ["庚", "경", "금"],
    branch: ["辰", "진", "토"],
  },
  { label: "월주", stem: ["辛", "신", "금"], branch: ["巳", "사", "화"] },
  { label: "연주", stem: ["庚", "경", "금"], branch: ["午", "오", "화"] },
];
const COUNT: Record<El, number> = { 목: 0, 화: 2, 토: 2, 금: 3, 수: 1 };

function Fold({
  eyebrow,
  title,
  children,
  open,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className="hj-card group mt-3 overflow-hidden bg-[#fffaf0]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5">
        <span>
          <span className="block text-[11px] font-extrabold text-[var(--stamp)]">
            {eyebrow}
          </span>
          <span className="font-display text-lg">{title}</span>
        </span>
        <span
          className="text-xl transition-transform group-open:rotate-180"
          aria-hidden
        >
          ⌄
        </span>
      </summary>
      <div className="px-4 pb-4 text-[15px] leading-relaxed">{children}</div>
    </details>
  );
}

function Result() {
  const total = Object.values(COUNT).reduce((a, b) => a + b, 0);
  return (
    <Page>
      <section className="mx-3 mt-3">
        <div className="hj-card bg-[var(--to)] px-4 py-5 text-center">
          <h1 className="font-display text-[22px]">나영님의 사주풀이</h1>
          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
            {["1990년 05월 15일", "양력", "14:30", "여성", "본인"].map((t) => (
              <span
                key={t}
                className="rounded-full border-2 border-[var(--line)] bg-[#fffaf0] px-2.5 py-0.5 text-xs font-extrabold"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-4 rounded-md border-2 border-dashed border-[var(--ink-soft)] bg-[#fffdf5] p-4">
          <span className="absolute -top-2.5 left-4 rotate-[-2deg] rounded bg-[var(--stamp)] px-2 py-0.5 text-[11px] font-extrabold text-white">
            내가 적어둔 고민
          </span>
          <p className="mt-1 text-[15px]">올해 이직을 해도 될지 고민이에요.</p>
        </div>

        {/* 나의 오행 친구: 부적 카드 */}
        <div className="hj-card relative mt-4 overflow-hidden bg-[#e9e5f6] px-4 pb-4 pt-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#fff]/50" />
          <p className="text-[11px] font-extrabold text-[var(--stamp)]">
            나의 오행 친구 · 일간 庚(쇠)
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Friend
              kind="rabbit"
              accessory="sunglasses"
              size={104}
              className="bob shrink-0"
            />
            <div>
              <p className="font-display text-[26px] leading-none">달토</p>
              <p className="mt-1 text-sm font-bold">
                토끼 오리 · 단단한 해결사
              </p>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                결단이 빠르고 의리 있는 쇠의 기운
              </p>
            </div>
          </div>
        </div>

        {/* 만세력 */}
        <section
          className="hj-card mt-4 overflow-hidden bg-[#fffaf0]"
          aria-label="만세력"
        >
          <h2 className="font-display bg-[var(--su)] py-2.5 text-center text-lg text-[#fffaf0]">
            만세력
          </h2>
          <div className="grid grid-cols-4 border-b-2 border-[var(--line)] text-center text-xs font-bold">
            {COLS.map((c) => (
              <p
                key={c.label}
                className={`py-1.5 ${c.me ? "bg-[var(--to)]" : "bg-[var(--paper-2)]"}`}
              >
                {c.label}
                {c.me ? " · 나" : ""}
              </p>
            ))}
          </div>
          {(["stem", "branch"] as const).map((row) => (
            <div key={row} className="grid grid-cols-4">
              {COLS.map((c) => {
                const [h, k, e] = c[row];
                return (
                  <div
                    key={c.label + row}
                    className="flex h-[84px] flex-col items-center justify-center border-r-2 border-t-2 border-[var(--line)] last:border-r-0"
                    style={{ background: EL_BG[e], color: EL_FG[e] }}
                  >
                    <span className="font-display text-[34px] leading-none">
                      {h}
                    </span>
                    <span className="mt-1 text-[11px] font-bold opacity-90">
                      {k} · {EL_WORD[e]}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          <p className="border-t-2 border-[var(--line)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--ink-soft)]">
            위 줄은 하늘 글자(천간), 아래 줄은 땅 글자(지지)예요. 칸 색은
            오방색: 목 청, 화 적, 토 황, 금 백, 수 흑.
          </p>
        </section>

        <Fold eyebrow="오행으로 보는 사주" title="8글자 속 다섯 기운" open>
          <p className="mb-3">쇠(金)의 기운이 가장 많고, 나무(木)는 없어요.</p>
          {(Object.keys(COUNT) as El[]).map((k) => (
            <div key={k} className="my-1.5 flex items-center gap-2">
              <span className="w-14 text-sm font-bold">
                {k} {EL_WORD[k]}
              </span>
              <div className="h-3.5 flex-1 overflow-hidden rounded-full border-2 border-[var(--line)] bg-[#fffdf5]">
                <div
                  className="h-full"
                  style={{
                    width: `${(COUNT[k] / total) * 100}%`,
                    background: EL_BG[k],
                  }}
                />
              </div>
              <span className="w-4 text-right text-sm font-bold">
                {COUNT[k]}
              </span>
            </div>
          ))}
        </Fold>
        <Fold eyebrow="나만의 매력" title="이런 점이 빛나요꽥">
          <ul className="flex flex-wrap gap-2">
            {["결단력", "의리", "추진력"].map((t) => (
              <li
                key={t}
                className="rounded-full border-2 border-[var(--line)] bg-[#d3ead9] px-3 py-1 text-sm font-bold"
              >
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-[var(--ink-soft)]">
            ※ 성격 설명은 재미를 위한 창작 표현이에요.
          </p>
        </Fold>
        <Fold eyebrow="쓴소리 좀 할게" title="이런 건 조심해요꽥">
          <ul className="flex flex-wrap gap-2">
            {["고집", "말이 직설적"].map((t) => (
              <li
                key={t}
                className="rounded-full border-2 border-[var(--line)] bg-[#fbd9d4] px-3 py-1 text-sm font-bold"
              >
                {t}
              </li>
            ))}
          </ul>
        </Fold>

        <div className="hj-card mt-4 bg-[#dfe9f7] p-4">
          <p className="font-display text-lg">내 고민, 더 깊게 풀어볼까꽥?</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            적어주신 고민을 반영한 기본 사주 풀이를 볼 수 있어요.
          </p>
          <button
            type="button"
            className="font-display mt-3 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3 text-white shadow-[3px_3px_0_var(--line)]"
          >
            기본 사주 풀이 보기 · 1닢
          </button>
        </div>
      </section>
    </Page>
  );
}
