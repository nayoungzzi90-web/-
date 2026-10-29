import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "이용약관 — 오행 친구들" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Shell title="이용약관">
      <LegalPage docKey="terms" />
    </Shell>
  ),
});
