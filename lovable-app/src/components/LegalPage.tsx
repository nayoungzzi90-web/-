import { useEffect, useState } from "react";
import { MiniMarkdown } from "@/components/MiniMarkdown";
import { loadLegal, type LegalDoc, type LegalKey } from "@/lib/legal";

/** 법적 문서 화면. 승인 전 운영에서는 "준비 중"만 보인다. */
export function LegalPage({ docKey }: { docKey: LegalKey }) {
  const [state, setState] = useState<{ done: boolean; doc: LegalDoc | null }>({
    done: false,
    doc: null,
  });
  useEffect(() => {
    let alive = true;
    loadLegal(docKey).then(
      (doc) => alive && setState({ done: true, doc }),
      () => alive && setState({ done: true, doc: null }),
    );
    return () => {
      alive = false;
    };
  }, [docKey]);
  if (!state.done)
    return <p className="mt-6 text-center text-sm text-muted-foreground">불러오는 중…</p>;
  if (!state.doc)
    return (
      <p role="status" className="card-hanji mt-4 p-5 text-center text-sm text-muted-foreground">
        이 문서는 아직 준비 중이에요. 서비스 정식 오픈 전에 안내해 드릴게요.
      </p>
    );
  return (
    <div>
      {state.doc.status === "draft" && (
        <p role="alert" className="rounded-xl bg-destructive/15 p-3 text-center text-sm font-bold">
          초안입니다 — 법무 검토 전이라 게시할 수 없어요(개발 화면에서만 보여요).
        </p>
      )}
      <MiniMarkdown source={state.doc.text} />
    </div>
  );
}
