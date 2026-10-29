import { createFileRoute, Link } from "@tanstack/react-router";
import { ReadingView } from "@/components/ReadingView";
import { Shell } from "@/components/Shell";
import { SAMPLE_NAME, SAMPLE_SECTIONS } from "@/lib/sample-reading";

export const Route = createFileRoute("/sample")({
  head: () => ({
    meta: [
      { title: "예시 풀이 미리보기 — 오행 친구들" },
      {
        name: "description",
        content: "기본 사주 풀이가 어떻게 나오는지 가상의 인물로 미리 볼 수 있어요.",
      },
      { property: "og:title", content: "예시 풀이 미리보기 — 오행 친구들" },
      { property: "og:description", content: "내 풀이는 이렇게 나와요." },
    ],
  }),
  component: SamplePage,
});

function SamplePage() {
  return (
    <Shell title="예시 풀이">
      <p className="mt-3 rounded-xl bg-gold/25 p-3 text-xs leading-relaxed">
        가상의 인물 <b>{SAMPLE_NAME}</b>님의 예시예요. 실제 풀이는 내 출생정보로 새로 만들어져요.
        재미와 자기이해를 위한 참고 자료이며, 미래를 단정하지 않아요.
      </p>
      <ReadingView sections={SAMPLE_SECTIONS} chars={0} needsReview={false} />
      <Link
        to="/input"
        className="mt-5 block rounded-full bg-primary py-3 text-center font-bold text-primary-foreground"
      >
        내 풀이 받아보기
      </Link>
    </Shell>
  );
}
