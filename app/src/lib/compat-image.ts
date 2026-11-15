// 궁합 결과를 공유용 이미지(PNG)로 만든다. 브라우저에서만 쓰고 서버로 보내지 않는다.
// 이미지에는 케미 온도(재미용)·한 줄 제목·짧은 설명·서비스 이름만 넣는다. 이름·생년월일·초대 링크는 넣지 않는다.
import type { CompatResult } from "@/lib/compat";

const W = 1080;
const H = 1350;
const INK = "#1b1613";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of Array.from(text)) {
    const next = cur + ch;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur.trimEnd());
      cur = ch === " " ? "" : ch;
    } else cur = next;
  }
  if (cur) lines.push(cur.trimEnd());
  return lines;
}

export async function makeCompatImage(res: Pick<CompatResult, "temp" | "title" | "lines">): Promise<Blob | null> {
  try {
    if (typeof document === "undefined") return null;
    try {
      await document.fonts?.load('48px "Jua"');
    } catch {
      /* 글꼴을 못 불러오면 기본 글꼴로 그린다 */
    }
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#fff9f0";
    ctx.fillRect(0, 0, W, H);
    const card = (x: number, y: number, w: number, h: number, r: number, fill: string, lw: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = lw;
      ctx.strokeStyle = INK;
      ctx.stroke();
    };
    card(60, 76, W - 120, H - 120, 56, INK, 0);
    card(60, 60, W - 120, H - 120, 56, "#e4f1fb", 8);

    const [pair, face] = await Promise.all([loadImage("/assets/ttotto-long-home/card-compatibility.webp"), loadImage("/assets/ttotto-long-home/logo-face.webp")]);

    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = '64px "Jua", "Gowun Dodum", sans-serif';
    ctx.fillText("또또사주", 140, 190);
    if (face) ctx.drawImage(face, 400, 120, 90, 90 * (face.height / face.width));

    ctx.textAlign = "center";
    ctx.font = '42px "Jua", "Gowun Dodum", sans-serif';
    ctx.fillStyle = "#ff6f45";
    ctx.fillText("우리의 오행 케미", W / 2, 290);

    if (pair) {
      const pw = 480;
      const ph = pw * (pair.height / pair.width);
      ctx.drawImage(pair, (W - pw) / 2, 315, pw, ph);
    }

    // 케미 온도
    ctx.fillStyle = INK;
    ctx.font = '150px "Jua", "Gowun Dodum", sans-serif';
    ctx.fillText(`${res.temp}°`, W / 2, 845);
    ctx.font = '36px "Gowun Dodum", "Apple SD Gothic Neo", sans-serif';
    ctx.fillStyle = "#625c55";
    ctx.fillText("케미 온도 (재미용)", W / 2, 898);
    // 온도 막대
    const bx = 200;
    const bw = W - 400;
    card(bx, 925, bw, 36, 18, "#fff", 5);
    ctx.beginPath();
    ctx.roundRect(bx + 4, 929, Math.max(28, ((bw - 8) * Math.min(100, Math.max(0, res.temp))) / 100), 28, 14);
    ctx.fillStyle = "#ff6f45";
    ctx.fill();

    // 제목과 설명
    ctx.fillStyle = INK;
    ctx.font = '56px "Jua", "Gowun Dodum", sans-serif';
    let y = 1050;
    for (const line of wrap(ctx, res.title, W - 300).slice(0, 2)) {
      ctx.fillText(line, W / 2, y);
      y += 68;
    }
    ctx.font = '38px "Gowun Dodum", "Apple SD Gothic Neo", sans-serif';
    ctx.fillStyle = "#3a312b";
    for (const l of res.lines.slice(0, 1)) {
      for (const line of wrap(ctx, l, W - 300).slice(0, 2)) {
        ctx.fillText(line, W / 2, y + 6);
        y += 52;
      }
    }

    ctx.fillStyle = INK;
    ctx.font = '34px "Jua", "Gowun Dodum", sans-serif';
    ctx.fillText("나랑 친구도 케미 볼래? · 또또사주", W / 2, 1275);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } catch {
    return null;
  }
}
