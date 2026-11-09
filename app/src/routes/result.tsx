import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Friend } from "@/components/Friends";
import { Coin, Page } from "@/components/Shell";

export const Route = createFileRoute("/result")({ component: Result });

// ─────────────────────────────────────────────────────────────
// 시안(초안). 아래 사주 값과 문장은 예시이며, 실제 서비스에서는
//  - 간지·십성·오행 개수는 계산 엔진이 만들고,
//  - 문장은 "승인된 근거"(근거 칩)에서만 AI가 쓴다.
// 검증 전 규칙(격국·용신·신강신약 등)은 단정하지 않는다.
// ─────────────────────────────────────────────────────────────
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

function Basis({ items }: { items: string[] }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="font-extrabold text-[var(--ink-soft)]">근거</span>
      {items.map((t) => (
        <span
          key={t}
          className="rounded-md border-[1.5px] border-[var(--ink-soft)] bg-[#fffdf5] px-1.5 py-0.5 font-bold text-[var(--ink)]"
        >
          {t}
        </span>
      ))}
    </p>
  );
}

function Fold({
  eyebrow,
  title,
  friend,
  summary,
  children,
  open,
}: {
  eyebrow: string;
  title: string;
  friend: "seonbi" | "ssi" | "tiger" | "rabbit" | "turtle";
  summary: string[];
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className="hj-card group mt-3 overflow-hidden bg-[#fffaf0]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3.5">
        <span className="shrink-0 rounded-2xl bg-[var(--paper-2)] p-0.5">
          <Friend kind={friend} size={44} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold text-[var(--stamp)]">
            {eyebrow}
          </span>
          <span className="font-display text-[17px] leading-snug">{title}</span>
        </span>
        <span
          className="text-xl transition-transform group-open:rotate-180"
          aria-hidden
        >
          ⌄
        </span>
      </summary>
      <div className="px-4 pb-4">
        <ul className="rounded-xl bg-[var(--paper-2)] px-3 py-2.5 text-[14px] font-bold leading-relaxed">
          {summary.map((s, i) => (
            <li key={s} className="flex gap-2">
              <span className="text-[var(--stamp)]">{["①", "②", "③"][i]}</span>
              {s}
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-3 text-[15px] leading-[1.75]">
          {children}
        </div>
      </div>
    </details>
  );
}

function Locked({
  eyebrow,
  title,
  teaser,
  price,
}: {
  eyebrow: string;
  title: string;
  teaser: string;
  price: string;
}) {
  return (
    <div className="hj-card relative mt-3 overflow-hidden bg-[#fffaf0] px-4 py-4">
      <p className="text-[11px] font-extrabold text-[var(--stamp)]">
        {eyebrow}
      </p>
      <p className="font-display text-[17px] leading-snug">{title}</p>
      <p
        className="mt-2 select-none text-[15px] leading-relaxed blur-[5px]"
        aria-hidden
      >
        {teaser}
      </p>
      <span className="stamp absolute right-3 top-3 !text-[13px]">
        <Coin size={13} /> {price}
      </span>
    </div>
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

        {/* 1. 점괘 판정: 긴 풀이보다 먼저, 내 고민에 대한 한 줄 답 */}
        <div className="relative mt-5 rounded-md border-2 border-dashed border-[var(--ink-soft)] bg-[#fffdf5] p-4">
          <span className="absolute -top-2.5 left-4 rotate-[-2deg] rounded bg-[var(--stamp)] px-2 py-0.5 text-[11px] font-extrabold text-white">
            내가 적어둔 고민
          </span>
          <p className="mt-1 text-[15px]">올해 이직을 해도 될지 고민이에요.</p>
        </div>
        <div className="hj-card relative mt-3 bg-[var(--su)] px-4 pb-4 pt-5 text-[#fffaf0]">
          <span
            className="font-display absolute -right-2 -top-3 flex h-14 w-14 rotate-12 items-center justify-center rounded-full border-[3px] border-[var(--stamp)] bg-[#fffaf0] text-[var(--stamp)]"
            aria-hidden
          >
            점괘
          </span>
          <p className="text-xs font-bold text-[#cfcbe0]">
            오리 점쟁이의 한 줄 판정
          </p>
          <p className="font-display mt-1 pr-10 text-[24px] leading-tight">
            움직이되, 발판부터 깔고 가꽥.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#e6e2f3]">
            변화를 부르는 기운은 충분해요. 다만 지금 사주에는 &lsquo;뻗어 나갈
            판(나무)&rsquo;이 비어 있어서, 맨몸 이직보다 준비한 이직이 잘 맞는
            편이에요.
          </p>
          <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
            <p className="font-extrabold text-[var(--to)]">이번 주 해볼 일</p>
            <ul className="mt-1 space-y-0.5">
              <li>☐ 옮기고 싶은 이유 세 줄로 적기</li>
              <li>☐ 이직 전에 포트폴리오 한 개 먼저 만들기</li>
              <li>☐ 경쟁이 심한 팀은 면접에서 한 번 더 확인하기</li>
            </ul>
          </div>
          <Basis items={["시간 癸(상관)", "월간 辛(겁재)", "오행 목 0개"]} />
        </div>

        {/* 2. 오행 친구 */}
        <div className="hj-card relative mt-4 overflow-hidden bg-[#e9e5f6] px-4 pb-4 pt-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/50" />
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
                토끼 오리 · 칼 가는 해결사
              </p>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                결단이 빠르고 의리 있는 쇠의 기운
              </p>
            </div>
          </div>
          <button
            type="button"
            className="font-display mt-3 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[#fffaf0] py-2.5 text-[15px] shadow-[3px_3px_0_var(--line)]"
          >
            내 오행 친구 카드 공유하기
          </button>
        </div>

        {/* 3. 만세력 */}
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

        {/* 4. 풀이 섹션: 시적인 한 줄 제목 + 핵심 3줄 + 자세히 + 근거 칩 */}
        <h2 className="font-display mt-7 px-1 text-xl">오리 점쟁이의 풀이</h2>

        <Fold
          open
          eyebrow="한마디로"
          friend="rabbit"
          title="달빛 아래 칼을 가는 토끼, 베기 전에 먼저 본다"
          summary={[
            "결단이 빠르고 의리가 센 쇠(金)의 사주",
            "8글자 중 쇠가 3개로 가장 많아요",
            "나무(木)가 없어서 '뻗어 나갈 판'이 숙제",
          ]}
        >
          <p>
            나영님의 사주는 庚(큰 쇠)이 두 개나 하늘에 떠 있어요. 한번
            마음먹으면 망설임 없이 잘라내는 시원한 결단력이 가장 먼저 보이는
            얼굴이에요. 대신 쇠를 다듬어 줄 불(火)이 두 개 곁에 있어서, 칼이
            무뎌지지 않게 늘 담금질을 받는 구조이기도 해요.
          </p>
          <p>
            한 가지 눈에 띄는 건 나무(木)가 하나도 없다는 점이에요. 쇠는 많은데
            베어 키울 나무가 없으니, 능력을 쏟아부을 &lsquo;판&rsquo;을 직접
            만들어야 힘이 살아나는 타입이에요.
          </p>
          <Basis
            items={["일간 庚", "연간 庚", "월간 辛", "오행 금 3 · 목 0"]}
          />
        </Fold>

        <Fold
          eyebrow="오행으로 보는 사주"
          friend="seonbi"
          title="쇠는 넘치고 나무는 비었다, 다섯 기운의 지도"
          summary={[
            "쇠 3 · 불 2 · 흙 2 · 물 1 · 나무 0",
            "비어 있는 기운은 '나쁨'이 아니라 '배울 자리'",
            "나무 기운은 새 시작·성장 활동으로 채워요",
          ]}
        >
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
          <p>
            여덟 글자가 쇠와 흙, 불에 몰려 있어요. 단단하고 현실적인 기운이 강한
            대신 부드럽게 뻗는 기운이 약하니, 새로운 분야를 &lsquo;배우고
            키우는&rsquo; 시간을 일부러 만들면 균형이 좋아져요.
          </p>
          <Basis items={["오행 개수 8글자 기준"]} />
        </Fold>

        <Fold
          eyebrow="나라는 사람 · 일주 庚辰"
          friend="tiger"
          title="자존심 하나로 버텨온 쇠, 흙 위에 서다"
          summary={[
            "일지 辰(흙)이 일간 쇠를 받쳐주는 구조",
            "월지 巳 · 연지 午의 불이 쇠를 단련",
            "혼자 해내려는 마음이 강해요",
          ]}
        >
          <p>
            태어난 날의 땅 글자 辰은 흙이에요. 쇠 아래에 흙이 깔려 있어서, 겉은
            단단한데 기본 체력과 버티는 힘이 든든한 편이에요. 누구에게
            기대기보다 내 손으로 일구는 쪽이 마음 편한 사람이죠.
          </p>
          <p>
            月의 巳와 연의 午는 모두 불이에요. 일찍부터 책임과 압박을 경험하며
            단련된 흔적으로 읽을 수 있어요. 그래서 &lsquo;쉽게 포기하지 않는
            사람&rsquo;이라는 인상이 따라다녀요.
          </p>
          <Basis items={["일지 辰(흙)", "월지 巳(불)", "연지 午(불)"]} />
        </Fold>

        <Fold
          eyebrow="쓴소리 좀 할게"
          friend="ssi"
          title="완벽주의라는 가면 뒤의 번아웃 예고장"
          summary={[
            "월간 辛(같은 쇠)이 곁에서 경쟁해요",
            "혼자 다 짊어지다 지칠 수 있어요",
            "동업·협업은 역할과 몫을 먼저 정해 두세요",
          ]}
        >
          <p>
            솔직히 말하면, 쇠가 너무 많아서 모든 걸 내 기준으로 자르고 싶은
            순간이 올 거예요. 월간 辛은 나와 같은 쇠라서 협력자이기도 하지만
            경쟁자가 되기도 해요. 이 부분이 이직할 때 &lsquo;같은 업계 동료와의
            거리&rsquo;로 나타나기 쉬워요.
          </p>
          <p>
            꽥, 팩트 하나만 더요. 시작도 전에 완벽하게 준비하려는 마음이 가장 큰
            적일 수 있어요. 70%에서 먼저 내보내 보세요.
          </p>
          <Basis items={["월간 辛(겁재)", "연간 庚(비견)"]} />
        </Fold>

        <Fold
          eyebrow="나만의 매력"
          friend="turtle"
          title="거친 비바람을 견디고 스스로 거목이 된 사람"
          summary={[
            "의리와 책임감이 겉으로도 느껴져요",
            "한 번 맡으면 끝까지 해요",
            "말은 직설적이지만 뒤끝은 없는 편",
          ]}
        >
          <p>
            나영님은 약속을 잘 지키는 사람이에요. 시간 癸(물)은 표현과 재치를
            뜻하는 글자라서, 마음에 담아둔 생각을 말이나 글로 풀어낼 때 매력이
            크게 살아나요. 결단력과 표현력이 만나는 지점이 나영님이 빛나는
            자리예요.
          </p>
          <Basis items={["시간 癸(상관)", "일간 庚"]} />
        </Fold>

        {/* 5. 잠금 티저: 기본 사주 풀이 1닢 */}
        <Locked
          eyebrow="연애운"
          title="대등한 눈높이에서 서로의 자존심을 지켜주는 인연"
          teaser="일지에 흙이 깔려 있어, 나를 통제하려 드는 상대와는 오래가기 어렵고 서로의 영역을 존중하는 사람을 만나야 편안함을 느끼는 사주예요."
          price="1닢"
        />
        <Locked
          eyebrow="재물복"
          title="내 손으로 일구는 자수성가형 재물의 기운"
          teaser="월지 불의 기운이 재물을 단련하는 구조라서, 소소하게 모으기보다 규모 있게 움직일 때 돈이 붙는 편이에요."
          price="1닢"
        />

        <div className="hj-card mt-5 bg-[#dfe9f7] p-4">
          <p className="font-display text-lg">내 고민, 더 깊게 풀어볼까꽥?</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            연애운·재물복에 올해 흐름까지, 적어주신 고민을 반영한 기본 사주
            풀이로 이어져요.
          </p>
          <button
            type="button"
            className="font-display mt-3 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3 text-white shadow-[3px_3px_0_var(--line)]"
          >
            기본 사주 풀이 보기 · 1닢
          </button>
        </div>

        <div className="hj-card mt-3 bg-[#d3ead9] p-4">
          <p className="font-display text-lg">친구랑 오행 케미도 볼래꽥?</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            링크를 보내면 친구도 자기 오행 친구를 만나요. 우리 둘의 궁합은 1닢.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="font-display flex-1 rounded-full border-[2.5px] border-[var(--line)] bg-[#fffaf0] py-2.5 shadow-[3px_3px_0_var(--line)]"
            >
              친구에게 링크 보내기
            </button>
            <button
              type="button"
              className="font-display flex-1 rounded-full border-[2.5px] border-[var(--line)] bg-[var(--to)] py-2.5 shadow-[3px_3px_0_var(--line)]"
            >
              궁합 보기
            </button>
          </div>
        </div>

        <p className="mt-5 px-1 text-[11px] leading-relaxed text-[var(--ink-soft)]">
          풀이는 사주 명리 해석을 바탕으로 한 참고용 재미예요. 계산 근거와
          한계는 &lsquo;근거&rsquo; 칩과 하단 안내에 적어 둬요. 중요한 결정은
          스스로의 판단과 전문가 상담을 함께 해주세요.
        </p>
      </section>
    </Page>
  );
}
