import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [{ title: "엽전 결제·환불 정책 — 오행 친구들" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Shell title="엽전 결제·환불 정책">
      <LegalPage docKey="refund" />
    </Shell>
  ),
});
