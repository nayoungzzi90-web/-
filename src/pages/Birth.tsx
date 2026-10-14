import { useNavigate } from 'react-router-dom';
import { BirthForm } from '../components/BirthForm';
import { createChart } from '../lib/mock/service';
import { mutate, track } from '../lib/mock/db';
import { useEffect } from 'react';

export default function Birth() {
  const nav = useNavigate();
  useEffect(() => { mutate((db) => track(db, 'birth_start')); }, []);
  return (
    <div>
      <h1>출생 정보 입력</h1>
      <p className="muted">가입 없이 볼 수 있어요. 입력한 정보는 이 기기에서만 계산·저장돼요.</p>
      <div className="card">
        <BirthForm
          submitLabel="내 캐릭터 만나기"
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
