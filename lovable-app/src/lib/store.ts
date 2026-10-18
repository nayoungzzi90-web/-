import { useSyncExternalStore } from "react";
import type { BirthInput } from "./saju";

interface State {
  loaded: boolean; // 첫 동기화 완료 여부
  signedIn: boolean;
  email: string | null;
  inviteCode: string | null;
  me: BirthInput | null;
  partner: BirthInput | null;
  coins: number;
  unlocked: string[];
}
let state: State = {
  loaded: false,
  signedIn: false,
  email: null,
  inviteCode: null,
  me: null,
  partner: null,
  coins: 0,
  unlocked: [],
};
const subs = new Set<() => void>();
export const getState = () => state;
export const setStore = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((s) => s());
};
export const useStore = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
    () => state,
  );
