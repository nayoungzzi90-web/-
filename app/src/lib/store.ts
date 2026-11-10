import { useSyncExternalStore } from "react";
import type { BirthInput } from "./saju";

// 이 기기 안에만 저장한다(서버로 보내지 않음). 생년월일은 민감할 수 있어 기기 밖으로 나가지 않는다.
export interface State {
  hydrated: boolean;
  me: BirthInput | null;
  concern: string;
  lastDaily: string | null; // 마지막으로 오늘의 복주머니를 연 날짜(KST)
  streak: number;
  invite: string | null; // 받은 궁합 초대 코드(이름·일주·오행 개수만 담김)
}
const KEY = "ohaeng:v1";
let state: State = {
  hydrated: false,
  me: null,
  concern: "",
  lastDaily: null,
  streak: 0,
  invite: null,
};
// 서버와 첫 하이드레이션이 쓰는 고정 초기값(저장된 값이 먼저 불러와져도 화면이 어긋나지 않게 한다).
const SERVER_STATE: State = {
  hydrated: false,
  me: null,
  concern: "",
  lastDaily: null,
  streak: 0,
  invite: null,
};
const subs = new Set<() => void>();

export const getState = () => state;
function emit() {
  subs.forEach((s) => s());
}
function persist() {
  try {
    const { me, concern, lastDaily, streak, invite } = state;
    localStorage.setItem(
      KEY,
      JSON.stringify({ me, concern, lastDaily, streak, invite }),
    );
  } catch {
    /* 저장소를 못 쓰는 환경(시크릿 모드 등)은 메모리 상태만 쓴다 */
  }
}
export function setStore(p: Partial<Omit<State, "hydrated">>) {
  state = { ...state, ...p };
  persist();
  emit();
}
export function hydrateStore() {
  if (state.hydrated) return;
  let saved: Partial<State> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<State>;
  } catch {
    saved = {};
  }
  state = {
    hydrated: true,
    me: saved.me ?? null,
    concern: typeof saved.concern === "string" ? saved.concern : "",
    lastDaily: saved.lastDaily ?? null,
    streak: typeof saved.streak === "number" ? saved.streak : 0,
    invite: typeof saved.invite === "string" ? saved.invite : null,
  };
  emit();
}
export function clearStore() {
  state = {
    hydrated: true,
    me: null,
    concern: "",
    lastDaily: null,
    streak: 0,
    invite: null,
  };
  persist();
  emit();
}
export const useStore = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
    () => SERVER_STATE,
  );
