import type { ReactNode } from "react";

// 결과 화면의 접고 펼치는 섹션(기본 HTML <details>라 키보드·스크린리더에서도 동작한다).
export function ResultSection({
  eyebrow,
  title,
  children,
  defaultOpen = false,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="card-hanji group mt-3 overflow-hidden" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">
          <span className="block text-[11px] font-bold text-primary">{eyebrow}</span>
          <span className="block font-serif text-base font-bold leading-snug">{title}</span>
        </span>
        <span
          className="text-xl text-primary transition-transform group-open:rotate-180"
          aria-hidden
        >
          ⌄
        </span>
      </summary>
      <div className="border-t-2 border-dashed border-border px-4 pb-4 pt-3 text-sm leading-relaxed">
        {children}
      </div>
    </details>
  );
}
