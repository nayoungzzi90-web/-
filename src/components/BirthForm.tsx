import { FormEvent, useState } from 'react';
import { calculator } from '../lib/saju/calculator';
import { BirthInput, CalcError } from '../lib/saju/types';

type Errors = Partial<Record<'date' | 'time' | 'calendar' | 'consent' | 'form', string>>;
const pad = (n: number) => String(n).padStart(2, '0');

/** 숫자만 쳐도 1995-05-17 형태로 정리 */
export const formatDate = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  const y = d.slice(0, 4), m = d.slice(4, 6), day = d.slice(6, 8);
  return y + (m ? `-${m}` : '') + (day ? `-${day}` : '');
};

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
  const [dateText, setDateText] = useState(initial?.year ? `${initial.year}-${pad(initial.month ?? 1)}-${pad(initial.day ?? 1)}` : '');
  const [unknown, setUnknown] = useState(initial?.timeUnknown ?? false);
  const [timeText, setTimeText] = useState(initial?.hour !== undefined ? `${pad(initial.hour)}:${pad(initial.minute ?? 0)}` : '');
  const [gender, setGender] = useState<'F' | 'M' | 'X' | ''>(initial?.gender ?? '');
  const [alias, setAlias] = useState(aliasDefault);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const id = (n: string) => `${idPrefix}-${n}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    const digits = dateText.replace(/\D/g, '');
    if (digits.length !== 8) errs.date = '생년월일을 8자리로 입력해 주세요. 예: 1990-01-01';
    const [hh, mm] = timeText.split(':').map(Number);
    const input: BirthInput = {
      calendar, leapMonth: calendar === 'lunar' && leap,
      year: Number(digits.slice(0, 4)), month: Number(digits.slice(4, 6)), day: Number(digits.slice(6, 8)),
      timeUnknown: unknown, hour: unknown || !timeText ? undefined : hh, minute: unknown || !timeText ? undefined : mm,
      gender: gender || undefined, country: 'KR', alias: showAlias ? alias : undefined,
    };
    try {
      if (!errs.date) calculator.calculate(input); // 검증 겸 사전 계산 (결과는 저장하지 않음)
    } catch (err) {
      if (err instanceof CalcError) {
        if (err.code === 'INVALID_TIME') errs.time = '태어난 시간을 선택하거나 "시간을 몰라요"를 체크해 주세요.';
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

      <div className="field">
        <label htmlFor={id('date')}>생년월일</label>
        <input id={id('date')} className="input" inputMode="numeric" autoComplete="bday" placeholder="예: 1990-01-01" maxLength={10}
          value={dateText} onChange={(e) => setDateText(formatDate(e.target.value))} aria-invalid={!!errors.date} aria-describedby={id('date-help')} />
        <p id={id('date-help')} className="muted small" style={{ margin: '6px 0 0' }}>숫자만 입력하면 돼요. 한국에서 태어난 경우만 계산할 수 있어요.</p>
        {errors.date && <p className="err" role="alert">{errors.date}</p>}
      </div>

      <fieldset>
        <legend>달력 종류</legend>
        <div className="seg cal" role="radiogroup" aria-label="달력 종류">
          <label><input type="radio" name={id('cal')} checked={calendar === 'solar'} onChange={() => setCalendar('solar')} />양력</label>
          <label><input type="radio" name={id('cal')} checked={calendar === 'lunar'} onChange={() => setCalendar('lunar')} />음력</label>
        </div>
        {calendar === 'lunar' && (
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} />윤달이에요</label>
        )}
        {errors.calendar && <p className="err" role="alert">{errors.calendar}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor={id('time')}>태어난 시간</label>
        <input id={id('time')} className="input" type="time" disabled={unknown} value={timeText} onChange={(e) => setTimeText(e.target.value)} aria-invalid={!!errors.time} />
        <label className="check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} />시간을 몰라요 (시주 없이 계산해요)
        </label>
        {errors.time && <p className="err" role="alert">{errors.time}</p>}
      </div>

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
      <button className="btn block go" type="submit">{submitLabel}</button>
    </form>
  );
}
