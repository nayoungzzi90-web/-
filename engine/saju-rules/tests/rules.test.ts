import { describe, expect, it } from 'vitest';
import { calculate } from '../../manse/src/engine';
import {
  analyzeR002toR005, BRANCHES, commanderOf, fromManse, MODERN_30_CANDIDATE_V1, runR002, runR003, runR004, runR005, STATIC_HIDDEN, STEMS, tenGodOf,
  type Branch, type Chart, type Stem,
} from '../src';

const P = (g: string) => ({ stem: g[0] as Stem, branch: g[1] as Branch });
const chart = (y: string, m: string, d: string, h: string | null): Chart => ({ pillars: { year: P(y), month: P(m), day: P(d), hour: h ? P(h) : null }, upstreamApproved: false });

describe('R-002 월령 왕상휴수사', () => {
  // 전통 오행 왕상휴수사 표(손으로 적음): 계절 → 일간 오행별 등급
  const TABLE: Record<string, Record<string, string>> = {
    spring: { wood: '旺', fire: '相', earth: '死', metal: '囚', water: '休' },
    summer: { wood: '休', fire: '旺', earth: '相', metal: '死', water: '囚' },
    autumn: { wood: '死', fire: '囚', earth: '休', metal: '旺', water: '相' },
    winter: { wood: '相', fire: '死', earth: '囚', metal: '休', water: '旺' },
    transition: { wood: '囚', fire: '休', earth: '旺', metal: '相', water: '死' },
  };
  const SEASON: Record<Branch, string> = { 寅: 'spring', 卯: 'spring', 巳: 'summer', 午: 'summer', 申: 'autumn', 酉: 'autumn', 亥: 'winter', 子: 'winter', 辰: 'transition', 未: 'transition', 戌: 'transition', 丑: 'transition' };
  const EL: Record<Stem, string> = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
  it('10천간 × 12월지 120개 조합이 전통 표와 같고, 득령 협의·광의가 맞다', () => {
    let n = 0;
    for (const s of STEMS) for (const b of BRANCHES) {
      const r = runR002({ pillars: { year: { stem: '甲', branch: '子' }, month: { stem: '甲', branch: b }, day: { stem: s, branch: '子' }, hour: null }, upstreamApproved: false });
      const want = TABLE[SEASON[b]]![EL[s]];
      expect(r.seasonal_grade, `${s}${b}`).toBe(want);
      expect(r.deukryeong_narrow).toBe(want === '旺');
      expect(r.deukryeong_broad).toBe(want === '旺' || want === '相');
      expect(r.strength).toBe('not_evaluated');
      n++;
    }
    expect(n).toBe(120);
  });
  it('토월(辰未戌丑)은 잠정(provisional)과 검토 특성, 그 외는 계산 사실', () => {
    for (const b of ['辰', '未', '戌', '丑'] as Branch[]) {
      const r = runR002(chart('甲子', `甲${b}`, '甲子', null));
      expect(r.grade_status).toBe('provisional');
      expect(r.transition_trait).toBeTruthy();
      expect(r.transition_detail).toBe('not_evaluated');
    }
    expect(runR002(chart('甲子', '丙寅', '甲子', null)).grade_status).toBe('structural_fact');
  });
  it('잘못된 입력은 중단(blocked)', () => {
    const r = runR002({ pillars: { year: P('甲子'), month: { stem: '甲', branch: 'X' as Branch }, day: P('甲子'), hour: null }, upstreamApproved: false });
    expect(r.status).toBe('blocked');
    expect(r.seasonal_grade).toBeNull();
  });
});

describe('R-003 지장간·사령', () => {
  it('정적 지장간은 기준서(연해자평) 표와 같다', () => {
    const want: Record<Branch, string> = { 子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙庚戊', 午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲' };
    const main: Record<Branch, string> = { 子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬' };
    for (const b of BRANCHES) { expect(STATIC_HIDDEN[b].members.join(''), b).toBe(want[b]); expect(STATIC_HIDDEN[b].main).toBe(main[b]); }
  });
  it('후보 분일표는 각 월 합계 30', () => {
    for (const b of BRANCHES) expect(MODERN_30_CANDIDATE_V1[b].reduce((a, [, d]) => a + d, 0), b).toBe(30);
  });
  const term = { startMs: 0, endMs: 30 * 86_400_000 };
  const at = (day: number) => ({ exactMs: day * 86_400_000 });
  it('normalized_30_v1: 시작 시각은 첫 구간, 구간 경계는 새 구간, 끝 시각은 이 달이 아님', () => {
    expect(commanderOf('寅', term, at(0)).stem).toBe('戊');
    expect(commanderOf('寅', term, at(6.999)).stem).toBe('戊');
    expect(commanderOf('寅', term, at(7)).stem).toBe('丙'); // 경계 = 새 구간
    expect(commanderOf('寅', term, at(14)).stem).toBe('甲');
    expect(commanderOf('寅', term, at(29.999)).stem).toBe('甲');
    expect(commanderOf('寅', term, at(30)).status).toBe('blocked');
    expect(commanderOf('寅', term, at(0)).status).toBe('candidate'); // 미검증 후보표라 사실이 아님
  });
  it('실제 절입 간격에 비례 배분한다(30일이 아닌 달)', () => {
    const t = { startMs: 0, endMs: 31 * 86_400_000 };
    expect(commanderOf('子', t, { exactMs: 31 * 86_400_000 * (10 / 30) - 1 }).stem).toBe('壬');
    expect(commanderOf('子', t, { exactMs: 31 * 86_400_000 * (10 / 30) }).stem).toBe('癸');
  });
  it('출생 시간 미상으로 여러 구간이 가능하면 단일 사령을 확정하지 않는다', () => {
    const r = commanderOf('寅', term, { fromMs: 6.5 * 86_400_000, toMs: 7.5 * 86_400_000 });
    expect(r.status).toBe('review_required');
    expect(r.stem).toBeNull();
    expect(r.candidates).toEqual(['戊', '丙']);
    expect(commanderOf('寅', term, { fromMs: 1 * 86_400_000, toMs: 2 * 86_400_000 }).stem).toBe('戊');
  });
  it('삼명통회 규칙집은 원문 미확보로 계산하지 않고, 결과를 따로 보존한다', () => {
    const r = runR003(chart('甲子', '丙寅', '甲子', null), { monthTerm: term, birth: at(3) });
    expect(r.monthCommander!.smth.status).toBe('not_evaluated');
    expect(r.monthCommander!.smth.reason).toMatch(/SOURCE_MISSING/);
    expect(r.monthCommander!.modern.stem).toBe('戊');
    expect(r.monthCommander!.differs).toBeNull();
    expect(r.layerClassification).toBe('classification_pending');
  });
});

describe('R-004 통근', () => {
  const rootsOf = (c: Chart, pos: 'year' | 'month' | 'day' | 'hour') => runR004(c).stems.find((s) => s.position === pos)!;
  it('생조(水生木)는 뿌리가 아니다: 甲 + 子 지지뿐이면 무근', () => {
    const r = rootsOf(chart('壬子', '壬子', '甲子', '壬子'), 'day');
    expect(r.hasStructuralRoot).toBe(false);
    expect(r.roots).toEqual([]);
  });
  it('같은 글자/같은 오행, 본기/비본기 구분과 일지·월지 플래그', () => {
    const r = rootsOf(chart('壬子', '丙寅', '甲亥', null), 'day');
    const month = r.roots.find((x) => x.branchPosition === 'month')!;
    expect(month).toMatchObject({ kind: 'exact_stem', layer: 'main_qi', hiddenStem: '甲' });
    const day = r.roots.find((x) => x.branchPosition === 'day')!;
    expect(day).toMatchObject({ kind: 'exact_stem', layer: 'secondary_qi', secondaryDetail: 'classification_pending' });
    expect(r.day_branch_rooted).toBe(true);
    expect(r.month_branch_rooted).toBe(true);
    const yi = rootsOf(chart('壬子', '丁卯', '乙巳', null), 'day');
    expect(yi.roots[0]).toMatchObject({ kind: 'exact_stem', branch: '卯' });
    const jia = rootsOf(chart('壬子', '丁卯', '甲午', null), 'day');
    expect(jia.roots[0]).toMatchObject({ kind: 'same_element', layer: 'main_qi', hiddenStem: '乙' });
  });
  it('같은 지장간은 원천 ID 하나(중복 가산 방지), 시간 미상이면 시지를 탐색하지 않는다', () => {
    const r = runR004(chart('甲寅', '丙寅', '甲子', null));
    const a = r.stems.find((s) => s.position === 'year')!.roots.find((x) => x.branchPosition === 'year')!;
    const b = r.stems.find((s) => s.position === 'day')!.roots.find((x) => x.branchPosition === 'year')!;
    expect(a.sourceId).toBe(b.sourceId);
    expect(r.stems.map((s) => s.position)).toEqual(['year', 'month', 'day']);
    expect(r.root_modification).toBe('not_evaluated');
  });
  it('4천간 × 4지지 전체 탐색: 모든 천간이 결과에 있다', () => {
    const r = runR004(chart('庚申', '辛酉', '庚辰', '丙戌'));
    expect(r.stems.length).toBe(4);
    expect(r.stems.find((s) => s.position === 'hour')!.roots.map((x) => x.branch)).toEqual(['戌']); // 丙 → 戌의 丁(같은 오행)
  });
});

describe('R-005 천간 관계', () => {
  it('십성: 甲·丙·庚 일간 기준 표와 같고, 10×10 모든 일간에서 10개 십성이 하나씩', () => {
    const row = (d: Stem) => STEMS.map((s) => tenGodOf(d, s)).join(',');
    expect(row('甲')).toBe('비견,겁재,식신,상관,편재,정재,편관,정관,편인,정인');
    expect(row('丙')).toBe('편인,정인,비견,겁재,식신,상관,편재,정재,편관,정관');
    expect(row('庚')).toBe('편재,정재,편관,정관,편인,정인,비견,겁재,식신,상관');
    for (const d of STEMS) expect(new Set(STEMS.map((s) => tenGodOf(d, s))).size, d).toBe(10);
  });
  it('일간 자신은 비견으로 세지 않고, 6개 쌍·인접성을 기록한다', () => {
    const r = runR005(chart('甲子', '甲寅', '甲辰', '甲子'));
    expect(r.counts.peer).toBe(3);
    expect(r.relations.length).toBe(3);
    expect(r.pairs.length).toBe(6);
    const adj = (a: string, b: string) => r.pairs.find((p) => p.a === a && p.b === b)!.adjacent;
    expect(adj('year', 'day')).toBe(false);
    expect(adj('month', 'day')).toBe(true);
    expect(adj('day', 'hour')).toBe(true);
    expect(runR005(chart('甲子', '甲寅', '甲辰', null)).pairs.length).toBe(3);
    expect(r.deukse).toBe('not_evaluated');
  });
  it('구조 후보는 일간을 뺀 천간끼리, 성립은 판단하지 않음(재극인)', () => {
    const r = runR005(chart('戊子', '癸亥', '甲子', null)); // 戊=편재, 癸=정인, 土剋水
    expect(r.structures).toEqual([{ kind: 'wealth_controls_resource', from: 'year', to: 'month', status: 'candidate' }]);
  });
  it('간합: 존재·인접·사이·쟁합만 기록하고 오행은 바꾸지 않는다', () => {
    const r = runR005(chart('己丑', '甲子', '甲寅', '己巳'));
    expect(r.combinations.length).toBe(4); // 己-甲 쌍들
    const yd = r.combinations.find((c) => c.pair[0] === 'year' && c.pair[1] === 'day')!;
    expect(yd.adjacent).toBe(false);
    expect(yd.between).toEqual(['month']);
    expect(yd.competing.length).toBeGreaterThan(0);
    expect(yd.effect).toBe('not_evaluated');
    expect(yd.transformation).toBe('not_evaluated');
    expect(r.relations.find((x) => x.position === 'year')!.tenGod).toBe('정재'); // 합이 있어도 원래 십성 유지
  });
});

describe('만세력 연결과 재현성', () => {
  const run = () => {
    const m = calculate({ calendar: 'solar', year: 1995, month: 5, day: 17, hour: 14, minute: 0, gender: 'F' }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never);
    if (!m.ok) throw new Error('engine');
    const { chart: c, monthTerm, birth } = fromManse(m.value, 'test');
    return analyzeR002toR005(c, { monthTerm, birth });
  };
  it('실제 원국(1995-05-17 14시, 乙亥 辛巳 戊申 己未)에서 계산되고 같은 입력이면 같은 결과', () => {
    const a = run();
    expect(a.r002.seasonal_grade).toBe('相'); // 戊土, 巳월(火) → 火生土
    expect(a.r002.deukryeong_narrow).toBe(false);
    expect(a.r002.deukryeong_broad).toBe(true);
    expect(a.r004.stems.find((s) => s.position === 'day')!.hasStructuralRoot).toBe(true); // 巳의 戊, 申의 戊, 未의 己
    expect(a.r003.monthCommander!.modern.status).toBe('candidate');
    expect(a.r002.upstreamApproved).toBe(false);
    expect(JSON.stringify(run())).toBe(JSON.stringify(a));
    const ids = [...a.r002.evidence, ...a.r003.evidence, ...a.r004.evidence, ...a.r005.evidence].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('출생 시간 미상이면 하루(앞뒤 1시간 여유)를 범위로 두고 사령은 단일 확정하지 않을 수 있다', () => {
    const m = calculate({ calendar: 'solar', year: 1995, month: 5, day: 17, timeUnknown: true, gender: 'F' }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never);
    if (!m.ok) throw new Error('engine');
    const { chart: c, monthTerm, birth } = fromManse(m.value);
    expect(c.pillars.hour).toBeNull();
    expect(birth && 'fromMs' in birth).toBe(true);
    const r = analyzeR002toR005(c, { monthTerm, birth });
    expect(['candidate', 'review_required']).toContain(r.r003.monthCommander!.modern.status);
  });
});

describe('교차 검증: 만세력 엔진의 십성 구현과 100개 조합 일치', () => {
  it('saju-rules tenGodOf == engine/manse tenGod (서로 다른 구현)', async () => {
    const { tenGod } = await import('../../manse/src/tenGods');
    for (let d = 0; d < 10; d++) for (let s = 0; s < 10; s++) expect(tenGodOf(STEMS[d]!, STEMS[s]!), `${STEMS[d]}${STEMS[s]}`).toBe(tenGod(d, s));
  });
});
