import { useNavigate } from 'react-router-dom';
import { BirthForm } from '../components/BirthForm';
import { createChart } from '../lib/mock/service';
import { mutate, track } from '../lib/mock/db';
import { useEffect } from 'react';
import { ArtSvg } from '../components/art';

export default function Birth() {
  const nav = useNavigate();
  useEffect(() => { mutate((db) => track(db, 'birth_start')); }, []);
  return (
    <div>
      <div className="peek">
        <h1 className="title">태어난 순간의 이야기,<br />귀엽게 풀어드려요</h1>
        <p className="muted" style={{ margin: 0 }}>생년월일만 넣으면 무료 원국 풀이를 바로 볼 수 있어요.</p>
        <div className="row" aria-hidden>
          {(['甲', '丙', '戊', '庚', '壬'] as const).map((st) => <ArtSvg key={st} stem={st} className="art" size={90} />)}
        </div>
      </div>
      <div className="card">
        <BirthForm
          submitLabel="무료로 내 사주 보기"
          aliasLabel="별칭 (선택, 공유 카드에 표시돼요)"
          onSubmit={(input) => {
            const chart = createChart(input);
            nav(`/character/result/${chart.id}`);
          }}
        />
      </div>
      <div className="notice info">
        <b>개인정보 안내</b> · 수집 항목: 생년월일·출생 시간·성별(선택). 이용 목적: 사주 계산과 결과 표시. 로그인하기 전 체험 정보는 이 브라우저에만 보관돼요. 정식 서비스의 보관 기간·삭제 절차는 개인정보처리방침에 명시됩니다 <span className="badge mock">법률 검토 대기</span>
      </div>
    </div>
  );
}
