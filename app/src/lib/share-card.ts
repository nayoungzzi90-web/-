import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Friend, FRIEND_INFO, type FriendKind } from "@/components/Friends";

// 공유 카드(1080×1350 PNG). 직접 그린 오리 SVG를 캔버스에 그린다. 외부 이미지 없음.
export interface CardInput {
  kind: FriendKind;
  title: string; // 예: 달빛에 벼린 칼
  sub: string; // 예: 쇠(金)의 기운
  name: string;
  url: string;
}

const BG: Record<FriendKind, string> = {
  seonbi: "#cfe8d5",
  ssi: "#f9d3cf",
  tiger: "#f7e0a8",
  rabbit: "#e4e2ee",
  turtle: "#cdddf3",
};

function loadSvg(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("svg load"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
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
  const markup = renderToStaticMarkup(
    createElement(Friend, { kind: c.kind, size: 620 }),
  ).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  try {
    const img = await loadSvg(markup);
    ctx.drawImage(img, (W - 620) / 2, 170, 620, 620);
  } catch {
    /* 그림을 못 그려도 글자 카드는 만든다 */
  }
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
