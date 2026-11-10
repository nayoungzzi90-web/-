import type { Element, SajuPreview } from "./saju";
import {
  ELEMENTS,
  EL_HANJA,
  EL_WORD,
  relation,
  stemElement,
  type Relation,
} from "./reading";

// 궁합(재미용 케미): 두 사람의 일간 오행 관계와 오행 보완만 쓴다(결정론).
// 쓰지 않는 것(검증 전): 십성, 합·충, 격국, 용신, 대운. 점수는 재미용 '케미 온도'이며 예언이 아니다.
export interface Person {
  name: string;
  stem: number; // 일간 0~9
  branch: number; // 일지 0~11
  counts: Record<Element, number>;
}

export function personFromPreview(name: string, p: SajuPreview): Person | null {
  if (!p.ok || !p.pillars || !p.elements) return null;
  return {
    name,
    stem: p.pillars.day.stem,
    branch: p.pillars.day.branch,
    counts: p.elements,
  };
}

export type CompatKind = "twin" | "support" | "train";
export interface CompatResult {
  kind: CompatKind;
  title: string;
  temp: number; // 케미 온도(재미용)
  lines: [string, string, string];
  good: string[];
  watch: string[];
  aGains: Element[]; // A가 B에게서 채우는 기운
  bGains: Element[];
  basis: string[];
}

const BASE: Record<CompatKind, number> = { support: 82, twin: 74, train: 70 };

function gains(a: Person, b: Person): Element[] {
  return ELEMENTS.filter((e) => a.counts[e] === 0 && b.counts[e] >= 1);
}

export function compat(a: Person, b: Person): CompatResult {
  const ea = stemElement(a.stem);
  const eb = stemElement(b.stem);
  const rel: Relation = relation(ea, eb); // A 기준에서 본 B
  const kind: CompatKind =
    rel === "same"
      ? "twin"
      : rel === "helps" || rel === "gives"
        ? "support"
        : "train";
  const aGains = gains(a, b);
  const bGains = gains(b, a);
  const bonus = Math.min(3, aGains.length + bGains.length) * 6;
  const sameStem = a.stem === b.stem ? 2 : 0;
  const temp = Math.min(99, BASE[kind] + bonus + sameStem);
  const A = a.name,
    B = b.name;
  let title = "";
  let lines: [string, string, string];
  let good: string[];
  let watch: string[];
  if (kind === "twin") {
    title = "같은 결의 쌍둥이 케미";
    lines = [
      `두 사람의 일간이 같은 ${EL_WORD[ea]}(${EL_HANJA[ea]}) 기운이에요`,
      "말하지 않아도 통하는 순간이 많아요",
      "비슷해서 편하지만 부딪힐 땐 서로 안 져요",
    ];
    good = ["취향·가치관 맞추기 쉬워요", "함께 목표를 세우면 속도가 붙어요"];
    watch = ["둘 다 고집이 세지면 길게 가요", "역할을 나눠야 편해요"];
  } else if (kind === "support") {
    const giver = rel === "helps" ? B : A; // helps: B가 A를 살림
    const taker = rel === "helps" ? A : B;
    title = "서로를 살리는 짝";
    lines = [
      `${giver}님의 기운이 ${taker}님을 살려주는 흐름이에요`,
      `${taker}님은 ${giver}님 곁에서 힘이 나는 편이에요`,
      `${giver}님은 챙겨주다 지치지 않게 쉬는 시간이 필요해요`,
    ];
    good = [
      `${taker}님이 고마움을 자주 표현하기`,
      "함께 하는 일정에서 역할 나누기",
    ];
    watch = [
      `${giver}님이 늘 주는 쪽이 되지 않게 살피기`,
      "받는 쪽도 먼저 챙겨주기",
    ];
  } else {
    const leader = rel === "rules" ? A : B; // rules: A가 B를 다룸
    const other = rel === "rules" ? B : A;
    title = "서로 단련하는 짝";
    lines = [
      `${leader}님이 이끌고 ${other}님이 다듬는 흐름이에요`,
      "긴장감이 있어서 함께 있으면 성장하는 관계로 읽어요",
      "말투 하나로 분위기가 갈려서 표현이 중요해요",
    ];
    good = ["서로의 다른 점을 배우는 자세", "결정은 같이 하고 속도는 맞추기"];
    watch = [`${leader}님이 밀어붙이지 않기`, `${other}님이 참기만 하지 않기`];
  }
  const compl: string[] = [];
  if (aGains.length)
    compl.push(
      `${A}님에게 없는 ${aGains.map((e) => EL_WORD[e]).join("·")} 기운을 ${B}님이 채워줘요`,
    );
  if (bGains.length)
    compl.push(
      `${B}님에게 없는 ${bGains.map((e) => EL_WORD[e]).join("·")} 기운을 ${A}님이 채워줘요`,
    );
  if (compl.length) lines = [lines[0], lines[1], compl[0]!];
  return {
    kind,
    title,
    temp,
    lines,
    good,
    watch,
    aGains,
    bGains,
    basis: [
      `${A} 일간 ${EL_HANJA[ea]}(${EL_WORD[ea]})`,
      `${B} 일간 ${EL_HANJA[eb]}(${EL_WORD[eb]})`,
      ...(compl.length ? ["오행 보완"] : []),
    ],
  };
}
