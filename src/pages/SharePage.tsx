import { Link, useParams } from 'react-router-dom';
import { CharacterArt } from '../components/Character';
import { characterIdToBase } from '../lib/content/characters';

/** 공유 링크 랜딩: 캐릭터 종류(공개 정보)만 보여 주고 개인 정보는 전혀 없다. 추천 코드(?ref=)는 App 에서 캡처. */
export default function SharePage() {
  const { characterId = '' } = useParams();
  const base = characterIdToBase(characterId);
  return (
    <div className="center">
      <div className="card char-card">
        {base ? (<><CharacterArt base={base} /><h1>{base.name}</h1><p>{base.shareLine}</p></>) : <h1>오행 친구들</h1>}
        <p className="muted">친구가 나를 초대했어요. 생년월일만 넣으면 나는 어떤 친구인지 바로 알 수 있어요.</p>
        <Link className="btn block" to="/birth">나도 무료로 해보기</Link>
      </div>
    </div>
  );
}
