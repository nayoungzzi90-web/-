import { FormEvent, useState } from 'react';
import { calculator } from '../lib/saju/sampleCalculator';
import { BirthInput, CalcError } from '../lib/saju/types';

type Errors = Partial<Record<'date' | 'time' | 'calendar' | 'consent' | 'form', string>>;
const thisYear = new Date().getFullYear();

export interface BirthFormProps {
  submitLabel: string;
  onSubmit: (input: BirthInput) => void;
  aliasLabel?: string;
  aliasDefault?: string;
  showAlias?: boolean;
  showGender?: boolean;
  requireConsent?: string;
  initial?: Partial<BirthInput>;
  idPrefix?: string;
}

export function BirthForm({ submitLabel, onSubmit, aliasLabel = '별칭 (선택)', aliasDefault = '', showAlias = true, showGender = true, requireConsent, initial, idPrefix = 'b' }: BirthFormProps) {
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>(initial?.calendar ?? 'solar');
  const [leap, setLeap] = useState(false);
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [month, setMonth] = useState(initial?.month ? String(initial.month) : '');
  const [day, setDay] = useState(initial?.day ? String(initial.day) : '');
  const [unknown, setUnknown] = useState(initial?.timeUnknown ?? false);
  const [hour, setHour] = useState(initial?.hour !== undefined ? String(initial.hour) : '');
  const [minute, setMinute] = useState(initial?.minute !== undefined ? String(initial.minute) : '0');
  const [gender, setGender] = useState<'F' | 'M' | 'X' | ''>(initial?.gender ?? '');
  const [alias, setAlias] = useState(aliasDefault);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const id = (n: string) => `${idPrefix}-${n}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    const input: BirthInput = {
      calendar, leapMonth: calendar === 'lunar' && leap, year: Number(year), month: Number(month), day: Number(day),
      timeUnknown: unknown, hour: unknown ? undefined : hour === '' ? undefined : Number(hour), minute: unknown ? undefined : Number(minute || 0),
      gender: gender || undefined, country: 'KR', alias: showAlias ? alias : undefined,
    };
    if (!year || !month || !day) errs.date = '생년월일을 모두 입력해 주세요.';
    try {
      if (!errs.date) calculator.calculate(input); // 검증 겸 사전 계산 (결과는 저장하지 않음)
    } catch (err) {
      if (err instanceof CalcError) {
        if (err.code === 'INVALID_TIME') errs.time = err.message;
        else if (err.code === 'LUNAR_UNSUPPORTED') errs.calendar = err.message;
        else errs.date = err.message;
      } else errs.form = '계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
    }
    if (requireConsent && !consent) errs.consent = '안내를 확인하고 체크해 주세요.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => (document.querySelector('[aria-invalid="true"], .err') as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      return;
    }
    onSubmit(input);
  }

  return (
    <form onSubmit={submit} noValidate>
      {errors.form && <div className="notice error" role="alert">{errors.form}</div>}
      <fieldset>
        <legend>달력 종류</legend>
        <div className="seg" role="radiogroup" aria-label="달력 종류">
          <label><input type="radio" name={id('cal')} checked={calendar === 'solar'} onChange={() => setCalendar('solar')} />양력</label>
          <label><input type="radio" name={id('cal')} checked={calendar === 'lunar'} onChange={() => setCalendar('lunar')} />음력</label>
        </div>
        {calendar === 'lunar' && (
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} />윤달이에요</label>
        )}
        {errors.calendar && <p className="err" role="alert">{errors.calendar}</p>}
      </fieldset>

      <fieldset>
        <legend>생년월일</legend>
        <div className="grid2" style={{ gridTemplateColumns: '1.3fr 1fr 1fr' }}>
          <div><label className="sr-only" htmlFor={id('y')}>출생 연도</label>
            <input id={id('y')} className="input" inputMode="numeric" autoComplete="bday-year" placeholder="연도" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.date} aria-describedby={errors.date ? id('date-err') : undefined} /></div>
          <div><label className="sr-only" htmlFor={id('m')}>출생 월</label>
            <input id={id('m')} className="input" inputMode="numeric" autoComplete="bday-month" placeholder="월" maxLength={2} value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.date} /></div>
          <div><label className="sr-only" htmlFor={id('d')}>출생 일</label>
            <input id={id('d')} className="input" inputMode="numeric" autoComplete="bday-day" placeholder="일" maxLength={2} value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.date} /></div>
        </div>
        <p className="muted small" style={{ margin: '6px 0 0' }}>1920~{Math.min(thisYear, 2030)}년, 한국에서 태어난 경우만 계산할 수 있어요.</p>
        {errors.date && <p id={id('date-err')} className="err" role="alert">{errors.date}</p>}
      </fieldset>

      <fieldset>
        <legend>태어난 시간</legend>
        <div className="grid2">
          <div><label className="sr-only" htmlFor={id('h')}>시</label>
            <select id={id('h')} className="input" disabled={unknown} value={hour} onChange={(e) => setHour(e.target.value)} aria-invalid={!!errors.time}>
              <option value="">시 선택</option>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}시</option>)}
            </select></div>
          <div><label className="sr-only" htmlFor={id('min')}>분</label>
            <select id={id('min')} className="input" disabled={unknown} value={minute} onChange={(e) => setMinute(e.target.value)}>
              {Array.from({ length: 60 }, (_, m) => <option key={m} value={m}>{m}분</option>)}
            </select></div>
        </div>
        <label className="check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} />시간을 몰라요 (시주 없이 계산해요)
        </label>
        {errors.time && <p className="err" role="alert">{errors.time}</p>}
      </fieldset>

      {showGender && (
        <fieldset>
          <legend>성별 (선택)</legend>
          <div className="seg" role="radiogroup" aria-label="성별">
            {([['F', '여성'], ['M', '남성'], ['', '선택 안 함']] as const).map(([v, l]) => (
              <label key={l}><input type="radio" name={id('g')} checked={gender === v} onChange={() => setGender(v as 'F' | 'M' | '')} />{l}</label>
            ))}
          </div>
          <p className="muted small" style={{ margin: '6px 0 0' }}>캐릭터 선택에는 사용하지 않아요. 대운 계산 방식에만 필요할 수 있어요.</p>
        </fieldset>
      )}

      {showAlias && (
        <div className="field">
          <label htmlFor={id('alias')}>{aliasLabel}</label>
          <input id={id('alias')} className="input" maxLength={12} placeholder="실명 대신 별명을 써도 돼요" value={alias} onChange={(e) => setAlias(e.target.value)} autoComplete="nickname" />
        </div>
      )}

      {requireConsent && (
        <div className="field">
          <label className="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} /><span>{requireConsent}</span></label>
          {errors.consent && <p className="err" role="alert">{errors.consent}</p>}
        </div>
      )}
      <button className="btn block" type="submit">{submitLabel}</button>
    </form>
  );
}
