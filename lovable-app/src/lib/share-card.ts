// 공유용 캐릭터 카드 이미지(브라우저 전용, canvas). 출생정보는 그리지 않는다.
export interface CardInput {
  name: string;
  epithet?: string | undefined;
  emoji: string;
  element: string;
  personality: string;
  tone: "teal" | "vermilion" | "gold" | "indigo" | "muted";
}

const TONE_HEX: Record<CardInput["tone"], string> = {
  teal: "#2f7f78",
  vermilion: "#c8442f",
  gold: "#c99a2e",
  indigo: "#2f3f7a",
  muted: "#7a746a",
};

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch.trim() === "" ? "" : ch;
      if (lines.length === maxLines) return lines;
    } else line += ch;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export function renderShareCard(c: CardInput): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = "#f6efe0"; // 한지
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = TONE_HEX[c.tone];
  ctx.fillRect(0, 0, W, 640);
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.arc(W / 2, 320, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "260px sans-serif";
  ctx.fillStyle = "#000";
  ctx.fillText(c.emoji, W / 2, 330);
  ctx.fillStyle = "#6b6358";
  ctx.font = "38px 'Gowun Dodum', sans-serif";
  ctx.fillText(`${c.element}의 기운${c.epithet ? ` · ${c.epithet}` : ""}`, W / 2, 720);
  ctx.fillStyle = "#2a2118";
  ctx.font = "bold 92px 'Gowun Batang', serif";
  ctx.fillText(c.name, W / 2, 830);
  ctx.fillStyle = "#3d342a";
  ctx.font = "42px 'Gowun Dodum', sans-serif";
  wrap(ctx, c.personality, 860, 3).forEach((l, i) => ctx.fillText(l, W / 2, 940 + i * 64));
  ctx.fillStyle = "#6b6358";
  ctx.font = "34px 'Gowun Dodum', sans-serif";
  ctx.fillText("오행 친구들 · 너의 오행 친구는?", W / 2, 1250);
  ctx.font = "26px 'Gowun Dodum', sans-serif";
  ctx.fillText("재미를 위한 창작 캐릭터예요", W / 2, 1300);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
