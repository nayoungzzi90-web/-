import { createFileRoute } from "@tanstack/react-router";
import { Friend, FRIEND_INFO, type Accessory, type FriendKind } from "@/components/Friends";

export const Route = createFileRoute("/style")({ component: StyleBoard });

const CARDS: { kind: FriendKind; acc: Accessory; caption: string; h: number }[] = [
  { kind: "rabbit", acc: "sunglasses", caption: "복 들어간다 입벌려", h: 250 },
  { kind: "ssi", acc: "tiara", caption: "넌 공주야 다 꺼져", h: 190 },
  { kind: "tiger", acc: "cap", caption: "오늘 운세 좀 치는데", h: 210 },
  { kind: "seonbi", acc: "headphones", caption: "귀여운 제가 왔습니다", h: 230 },
  { kind: "turtle", acc: "party", caption: "느려도 도착은 합니다", h: 200 },
  { kind: "ssi", acc: "sunglasses", caption: "연애운 보러 왔어용", h: 240 },
];

function Caption({ children }: { children: string }) {
  return (
    <p
      className="absolute inset-x-2 bottom-2 text-center text-[13px] font-bold leading-tight text-white"
      style={{ textShadow: "0 0 3px #000, 0 0 3px #000, 1px 1px 2px #000" }}
    >
      {children}
    </p>
  );
}

function StyleBoard() {
  const cols = [CARDS.filter((_, i) => i % 2 === 0), CARDS.filter((_, i) => i % 2 === 1)];
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#111] px-3 pb-28 pt-6 text-white">
      <h1 className="text-center text-lg font-bold">오늘의 오행 친구</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(FRIEND_INFO) as FriendKind[]).map((k) => (
          <span key={k} className="shrink-0 rounded-xl bg-[#3a3a36] px-3 py-1.5 text-sm font-bold">
            {FRIEND_INFO[k].name} · {FRIEND_INFO[k].element}
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-1 flex-col gap-2">
            {col.map((c) => (
              <div
                key={c.caption}
                className="relative flex items-center justify-center overflow-hidden rounded-3xl"
                style={{ height: c.h, background: FRIEND_INFO[c.kind].tint }}
              >
                <Friend kind={c.kind} accessory={c.acc} size={Math.min(c.h - 30, 170)} />
                <Caption>{c.caption}</Caption>
              </div>
            ))}
          </div>
        ))}
      </div>
      <nav className="fixed inset-x-0 bottom-4 mx-auto flex w-fit gap-3">
        {["홈", "탐색", "마이"].map((t) => (
          <span
            key={t}
            className="flex h-14 w-16 items-center justify-center rounded-2xl bg-[#2c2c2a] text-sm font-bold shadow-lg"
          >
            {t}
          </span>
        ))}
      </nav>
    </main>
  );
}
