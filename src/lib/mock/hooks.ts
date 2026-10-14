import { balanceOf } from './ledger';
import { useDb } from './db';
import { currentUser } from './service';

/** 화면 공통 세션 정보. db 는 제자리 변경되므로 매 렌더에서 다시 계산한다(useDb 가 변경 시 리렌더 보장). */
export function useSession() {
  const db = useDb();
  const user = currentUser(db);
  const chart = db.activeChartId ? db.charts[db.activeChartId] ?? null : null;
  const balance = user ? balanceOf(db, user.id) : 0;
  return { db, user, chart, balance };
}
