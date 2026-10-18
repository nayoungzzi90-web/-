import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

// R-015 검증 전: 유료 풀이 열람 버튼 비활성화. DB 카탈로그 active=false와 일치.
// 이미 열람한 기록과 업전 잔액은 그대로 유지된다.
export function Paywall({ id, label, price, coins, children }: { id: string; label: string; price: string; coins: number; children: ReactNode }) {
  const s = useStore();
  if (s.unlocked.includes(id)) return <>{children}</>;
  return (
    <div className="card-hanji mt-4 p-5 text-center">
      <p className="text-3xl">🔒</p>
      <p className="mt-2 font-serif font-bold">{label} 전체 풀이</p>
      <p className="text-sm text-muted-foreground">{price} 또는 업전 {coins}냥</p>
      <button disabled className="mt-4 w-full rounded-full bg-muted py-3 font-bold text-muted-foreground">계산 엔진 검증 중 · 준비 중</button>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        정확한 만세력 검증이 끝나면 열 수 있어요.<br />이미 열어본 풀이와 업전 잔액은 그대로예요.
      </p>
    </div>
  );
}
