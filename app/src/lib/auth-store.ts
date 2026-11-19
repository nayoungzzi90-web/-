import { useSyncExternalStore } from "react";

// 로그인 상태(이 기기의 화면용, 저장하지 않는다). 로그인 세션 자체는 Supabase 클라이언트가 관리한다.
export interface AuthState {
  loaded: boolean; // 로그인 여부 확인이 끝났는가
  signedIn: boolean;
  email: string | null;
  coins: number | null; // null = 아직 모름·불러오지 못함
}
const INIT: AuthState = { loaded: false, signedIn: false, email: null, coins: null };
let state: AuthState = INIT;
const subs = new Set<() => void>();

export const getAuth = () => state;
export function setAuth(p: Partial<AuthState>) {
  state = { ...state, ...p };
  subs.forEach((s) => s());
}
export function useAuth(): AuthState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
    () => INIT,
  );
}
