import type { OutSection } from "@/lib/reading.server";

/** 풀이 본문 표시(표시 전용). 잠긴 섹션은 제목과 짧은 미리보기만 보인다(본문은 서버가 보내지 않는다). */
export function ReadingView({
  sections,
  chars,
  needsReview,
}: {
  sections: OutSection[];
  chars: number;
  needsReview: boolean;
}) {
  return (
    <div className="mt-3 space-y-3">
      {needsReview && (
        <p role="status" className="rounded-xl bg-gold/25 p-3 text-xs leading-relaxed">
          절입 시각에 가까운 출생이라 일부 해석이 달라질 수 있어요. 출생 시각을 확인하면 더
          정확해져요.
        </p>
      )}
      {sections.map((s, i) =>
        s.locked ? (
          <div key={s.id} className="card-hanji p-4" aria-label={`${s.title} (잠김)`}>
            <p className="flex items-center gap-2 font-serif font-bold">
              <span aria-hidden>🔒</span>
              {s.tag && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{s.tag}</span>
              )}
              {s.title}
            </p>
            {s.headline && <p className="mt-1 text-sm text-muted-foreground">{s.headline}</p>}
            <p className="mt-2 text-sm text-muted-foreground/70 [mask-image:linear-gradient(to_right,black,transparent)]">
              {s.teaser}
            </p>
          </div>
        ) : (
          <details key={s.id} className="card-hanji p-4" open={i === 0}>
            <summary className="cursor-pointer font-serif font-bold">
              {s.tag && (
                <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-[10px]">{s.tag}</span>
              )}
              {s.title}
            </summary>
            {s.headline && <p className="mt-2 text-sm font-bold">{s.headline}</p>}
            <div className="mt-2 space-y-2 text-sm leading-relaxed">
              {s.body.split("\n").map((line, j) => (line.trim() ? <p key={j}>{line}</p> : null))}
            </div>
          </details>
        ),
      )}
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        준비된 문장을 사주 사실에 맞춰 조합한 풀이예요(전체 {chars.toLocaleString()}자). 재미와 자기
        이해를 위한 참고 정보이며, 두 개의 독립된 계산이 같은 결과일 때만 보여 드려요.
      </p>
    </div>
  );
}
