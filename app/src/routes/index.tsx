import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => <main className="p-6 text-center">오행 친구들 (새 프로젝트)</main>,
});
