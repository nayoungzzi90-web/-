// 오늘의 운세쿠키 쪽지를 공유용 이미지(PNG)로 만든다. 브라우저에서만 쓴다(서버·저장소로 보내지 않는다).
// 이미지에는 쪽지 문구·날짜·서비스 이름만 넣는다. 이름·생년월일 등 개인 정보는 넣지 않는다.
import type { CookieResult } from "@/lib/daily-cookie";

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

export async function makeNoteImage(result: CookieResult): Promise<Blob | null> {
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

    // 카드
    const card = (x: number, y: number, w: number, h: number, r: number, fill: string, lw: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = lw;
      ctx.strokeStyle = INK;
      ctx.stroke();
    };
    card(60, 76, W - 120, H - 120, 56, INK, 0); // 그림자
    card(60, 60, W - 120, H - 120, 56, "#fff6d6", 8);

    const [face, cookie] = await Promise.all([loadImage("/assets/ttotto-long-home/logo-face.webp"), loadImage("/assets/ttotto/cookie-closed.webp")]);

    // 머리글
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK;
    ctx.font = '64px "Jua", "Gowun Dodum", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText("또또사주", 140, 190);
    if (face) ctx.drawImage(face, 400, 120, 90, 90 * (face.height / face.width));

    ctx.textAlign = "center";
    ctx.font = '40px "Jua", "Gowun Dodum", sans-serif';
    ctx.fillStyle = "#ff6f45";
    ctx.fillText("오늘의 운세쿠키에서 받은 쪽지", W / 2, 290);

    // 쪽지 종이
    card(130, 340, W - 260, 580, 36, "#fffdf8", 6);
    ctx.fillStyle = INK;
    ctx.font = '70px "Jua", "Gowun Dodum", sans-serif';
    const titleLines = wrap(ctx, result.title, W - 400);
    let y = 460;
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, y);
      y += 86;
    }
    ctx.font = '44px "Gowun Dodum", "Apple SD Gothic Neo", sans-serif';
    ctx.fillStyle = "#3a312b";
    y += 14;
    for (const line of wrap(ctx, result.message, W - 400).slice(0, 5)) {
      ctx.fillText(line, W / 2, y);
      y += 66;
    }
    if (result.action && y < 900) {
      ctx.font = '36px "Gowun Dodum", "Apple SD Gothic Neo", sans-serif';
      ctx.fillStyle = "#625c55";
      y += 20;
      for (const line of wrap(ctx, `${result.actionTitle} · ${result.action}`, W - 420).slice(0, 2)) {
        ctx.fillText(line, W / 2, y);
        y += 54;
      }
    }

    // 쿠키 장식과 바닥글
    if (cookie) ctx.drawImage(cookie, W / 2 - 110, 960, 220, 220 * (cookie.height / cookie.width));
    ctx.fillStyle = INK;
    ctx.font = '36px "Jua", "Gowun Dodum", sans-serif';
    ctx.fillText(`${result.dateKey} · 하루에 한 번, 운세를 뽑아봐!`, W / 2, 1270);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } catch {
    return null;
  }
}
