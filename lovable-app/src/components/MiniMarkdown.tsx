import type { ReactNode } from "react";

// 법적 문서용 아주 작은 마크다운 표시기(제목·목록·표·인용·굵게). HTML 을 직접 넣지 않으므로(React 텍스트 노드) 안전하다.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      m[1] !== undefined ? <strong key={i++}>{m[1]}</strong> : <code key={i++}>{m[2]}</code>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

export function MiniMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let k = 0;
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) {
      const level = h[1]!.length;
      const cls =
        level === 1
          ? "mt-2 font-serif text-xl font-bold"
          : level === 2
            ? "mt-6 font-serif text-base font-bold"
            : "mt-4 font-serif text-sm font-bold";
      blocks.push(
        level === 1 ? (
          <h1 key={k++} className={cls}>
            {inline(h[2]!)}
          </h1>
        ) : level === 2 ? (
          <h2 key={k++} className={cls}>
            {inline(h[2]!)}
          </h2>
        ) : (
          <h3 key={k++} className={cls}>
            {inline(h[2]!)}
          </h3>
        ),
      );
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      const q: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("> ")) q.push(lines[i++]!.slice(2));
      blocks.push(
        <blockquote key={k++} className="mt-3 rounded-xl bg-muted p-3 text-sm">
          {inline(q.join(" "))}
        </blockquote>,
      );
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        const row = lines[i++]!;
        if (/^\|[\s:|-]+\|$/.test(row)) continue; // 구분선
        rows.push(cells(row));
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={k++} className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {head?.map((c, j) => (
                  <th key={j} className="border border-border bg-muted p-2 text-left">
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, j) => (
                    <td key={j} className="border border-border p-2 align-top">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i]!))
        items.push(lines[i++]!.replace(/^(- |\d+\. )/, ""));
      const li = items.map((t, j) => <li key={j}>{inline(t)}</li>);
      blocks.push(
        ordered ? (
          <ol key={k++} className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {li}
          </ol>
        ) : (
          <ul key={k++} className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {li}
          </ul>
        ),
      );
      continue;
    }
    const p: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3} |> |\||- |\d+\. )/.test(lines[i]!))
      p.push(lines[i++]!);
    blocks.push(
      <p key={k++} className="mt-2 text-sm leading-relaxed">
        {inline(p.join(" "))}
      </p>,
    );
  }
  return <div>{blocks}</div>;
}
