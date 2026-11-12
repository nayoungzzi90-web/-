import { FRIEND_IMG, FRIEND_INFO, type FriendKind } from "@/components/Friends";

// 공유 카드(1080×1350 PNG). 복원 캐릭터 그림(public/restore/characters)을 캔버스에 그린다.
export interface CardInput {
  kind: FriendKind;
  title: string; // 예: 달빛에 벼린 칼
  sub: string; // 예: 쇠(金)의 기운
  name: string;
  url: string;
  /** 부캐(둘째 오행 친구). 주면 그림 왼쪽 아래에 작은 원으로 넣는다. */
  subKind?: FriendKind;
  /** 모임 판 인원. 2명 이상이면 오른쪽 위에 "n명이 모였어요" 도장을 찍는다. */
  count?: number;
}

const BG: Record<FriendKind, string> = {
  seonbi: "#cfe8d5",
  ssi: "#f9d3cf",
  tiger: "#f7e0a8",
  rabbit: "#e4e2ee",
  turtle: "#cdddf3",
};

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load"));
    img.src = src;
  });
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const out: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      out.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) out.push(line);
  return out;
}

export async function renderShareCard(c: CardInput): Promise<Blob> {
  const W = 1080,
    H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f7f0e1";
  ctx.fillRect(0, 0, W, H);
  // 오방색 띠
  ["#3b8f7b", "#d6463a", "#e8b23a", "#ece8df", "#2f3150"].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i * (W / 5), 0, W / 5, 28);
  });
  ctx.strokeStyle = "#2b2233";
  ctx.lineWidth = 6;
  ctx.fillStyle = BG[c.kind];
  ctx.beginPath();
  ctx.roundRect(70, 120, W - 140, 760, 56);
  ctx.fill();
  ctx.stroke();
  try {
    const img = await loadImg(FRIEND_IMG[c.kind]);
    const h = 640;
    const w = (img.width / img.height) * h;
    ctx.drawImage(img, (W - w) / 2, 170 + (620 - h) / 2 + 20, w, h);
  } catch {
    /* 그림을 못 그려도 글자 카드는 만든다 */
  }
  // 부캐: 왼쪽 아래 작은 원
  if (c.subKind) {
    const cx = 190,
      cy = 722,
      r = 78;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#fffaf0";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#2b2233";
    ctx.stroke();
    ctx.clip();
    try {
      const sub = await loadImg(FRIEND_IMG[c.subKind]);
      const sh = 190;
      const sw = (sub.width / sub.height) * sh;
      ctx.drawImage(sub, cx - sw / 2, cy - r + 12, sw, sh);
    } catch {
      /* 부캐 그림이 없어도 카드는 만든다 */
    }
    ctx.restore();
    ctx.fillStyle = "#2b2233";
    ctx.textAlign = "center";
    ctx.font = "700 28px 'Jua', 'Apple SD Gothic Neo', sans-serif";
    ctx.fillText(`부캐 ${FRIEND_INFO[c.subKind].name}`, cx, cy + r + 34);
  }
  // 모임 도장: 오른쪽 위
  if (c.count && c.count >= 2) {
    ctx.save();
    ctx.translate(860, 205);
    ctx.rotate((-6 * Math.PI) / 180);
    ctx.fillStyle = "#f7f0e1";
    ctx.strokeStyle = "#c2372b";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(-130, -48, 260, 96, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#c2372b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 42px 'Jua', 'Apple SD Gothic Neo', sans-serif";
    ctx.fillText(`${c.count}명이 모였어요`, 0, 2);
    ctx.restore();
  }
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#2b2233";
  ctx.textAlign = "center";
  ctx.font =
    "700 44px 'Jua', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  ctx.fillText(`${c.name}님의 오행 친구는`, W / 2, 960);
  ctx.font =
    "700 92px 'Jua', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  ctx.fillText(`${FRIEND_INFO[c.kind].name}!`, W / 2, 1070);
  ctx.font =
    "600 44px 'Gowun Dodum', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  const lines = wrap(ctx, `${c.title} · ${c.sub}`, W - 200);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 1140 + i * 56));
  ctx.fillStyle = "#c2372b";
  ctx.font = "700 36px 'Jua', sans-serif";
  ctx.fillText(c.url.replace(/^https?:\/\//, ""), W / 2, 1300);
  return await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/png"),
  );
}

export async function shareCard(
  c: CardInput,
  text: string,
): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const blob = await renderShareCard(c);
    const file = new File([blob], "ohaeng-friend.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ohaeng-friend.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
