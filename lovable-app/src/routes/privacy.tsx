import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "개인정보처리방침 — 오행 친구들" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Shell title="개인정보처리방침">
      <LegalPage docKey="privacy" />
    </Shell>
  ),
});
