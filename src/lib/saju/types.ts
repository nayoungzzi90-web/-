export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];
export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export const ELEMENT_KO: Record<Element, string> = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)',
};
export const STEM_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const BRANCH_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

export interface BirthInput {
  calendar: 'solar' | 'lunar';
  leapMonth: boolean;
  year: number;
  month: number;
  day: number;
  /** 0-23. timeUnknown 이면 무시된다. */
  hour?: number;
  minute?: number;
  timeUnknown: boolean;
  gender?: 'F' | 'M' | 'X';
  country: 'KR';
  alias?: string;
}

export type Pillar = string; // 예: '甲子'

export interface SajuFacts {
  chartId: string;
  inputHash: string;
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  dayMaster: Stem;
  fiveElements: Record<Element, number>;
  tenGods: { position: 'year' | 'month' | 'hour'; stem: Stem; god: TenGod }[];
  /** 대운은 검증된 라이브러리 연동 전까지 비어 있다. */
  luckCycles: { startAge: number; pillar: Pillar }[];
  computation: {
    engine_name: string;
    engine_version: string;
    rules_version: string;
    timezone_policy: string;
    /** 상업 라이선스·50건 교차 검증이 끝난 엔진만 true */
    verified: boolean;
  };
  warnings: string[];
}

export type TenGod = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';

export type CalcErrorCode =
  | 'INVALID_DATE'
  | 'OUT_OF_RANGE'
  | 'LUNAR_UNSUPPORTED'
  | 'INVALID_TIME'
  | 'UNSUPPORTED_COUNTRY';

export class CalcError extends Error {
  constructor(public code: CalcErrorCode, message: string) {
    super(message);
  }
}

/**
 * 만세력 계산 인터페이스. 검증된 상업 라이선스 라이브러리를 이 인터페이스로 감싸서 교체한다.
 * 지원하지 않는 입력은 값을 추측하지 말고 CalcError 를 던져야 한다.
 */
export interface ChartCalculator {
  readonly name: string;
  readonly version: string;
  readonly verified: boolean;
  calculate(input: BirthInput): SajuFacts;
  /** 해당 역년(입춘 기준)의 연주 */
  yearPillar(year: number): Pillar;
}
