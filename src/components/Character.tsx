import { useRef, useState } from 'react';
import { CharacterBase, CharacterResult, CHARACTERS } from '../lib/content/characters';
import { ArtSvg, ArtInner } from './art';

/**
 * 캐릭터 일러스트 슬롯: public/characters/{id}.webp 에 독자 제작 에셋을 넣고 VITE_CHARACTER_ASSETS=true 로 켠다.
 * 에셋이 없으면 코드로 그린 임시 플레이스홀더(원본 저작물 복제 아님)를 보여준다.
 */
const HAS_ASSETS = String(import.meta.env.VITE_CHARACTER_ASSETS).toLowerCase() === 'true';

/**
 * 캐릭터 일러스트: 기본은 코드로 그린 독자 일러스트(components/art.tsx).
 * 디자이너가 만든 최종 에셋이 생기면 public/characters/{id}.webp 를 넣고 VITE_CHARACTER_ASSETS=true 로 교체한다.
 */
export function CharacterArt({ base, size = 200, className = 'art' }: { base: CharacterBase; size?: number; className?: string }) {
  const [useImg, setUseImg] = useState(HAS_ASSETS);
  if (useImg) {
    return <img className={className} src={`/characters/${base.id}.webp`} alt={base.name} width={size} height={size} onError={() => setUseImg(false)} />;
  }
  return <ArtSvg stem={base.stem} size={size} className={className} label={base.name} />;
}

export function CharacterCard({ base, result, alias }: { base: CharacterBase; result: CharacterResult; alias?: string }) {
  return (
    <div className="card char-card" style={{ borderColor: base.color }}>
      <p className="epithet" style={{ marginBottom: 0 }}>{result.epithet}</p>
      <CharacterArt base={base} />
      <h1 style={{ marginBottom: 2 }}>{alias ? `${alias}의 ` : ''}{base.name}</h1>
      <p className="muted">{base.summary}</p>
      <div className="tags">
        <span className="badge">{result.expression.emoji} {result.expression.label}</span>
        <span className="badge">{result.prop.emoji} {result.prop.label}</span>
      </div>
    </div>
  );
}

/** 공유용 카드: 이름(별칭)·칭호·한 줄 설명·캐릭터·초대 링크만 포함. 생년월일·시간·성별·원국·이메일은 절대 넣지 않는다. */
export function ShareCard({ base, result, alias, inviteUrl, svgRef }: { base: CharacterBase; result: CharacterResult; alias?: string; inviteUrl: string; svgRef: React.RefObject<SVGSVGElement> }) {
  const host = inviteUrl.replace(/^https?:\/\//, '');
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 450" width="100%" role="img" aria-label="공유 카드 미리보기" style={{ borderRadius: 20, display: 'block' }}>
      <rect width="360" height="450" fill="#FBF4E4" />
      <rect x="10" y="10" width="340" height="430" rx="26" fill="#FFFDF6" stroke="#3A2A24" strokeWidth="4" />
      <rect x="14" y="16" width="340" height="430" rx="26" fill="none" />
      <text x="180" y="54" textAnchor="middle" fontSize="15" fill="#B2552F" fontWeight="800">{result.epithet}</text>
      <text x="180" y="88" textAnchor="middle" fontSize="25" fill="#3A2A24" fontWeight="900">{alias ? `${alias}의 ` : ''}{base.name}</text>
      <path d="M42 214c0-76 52-112 138-112s138 36 138 112c0 66-56 102-138 102S42 280 42 214z" fill={base.color} opacity=".22" stroke="#3A2A24" strokeWidth="3.5" />
      <svg x="80" y="112" width="200" height="200" viewBox="-8 -8 216 216"><ArtInner stem={base.stem} /></svg>
      <text x="180" y="344" textAnchor="middle" fontSize="14.5" fill="#3A2A24">{base.summary}</text>
      <text x="180" y="368" textAnchor="middle" fontSize="14" fill={base.color} fontWeight="800">{base.shareLine}</text>
      <rect x="40" y="388" width="280" height="38" rx="19" fill="#C85A4F" stroke="#3A2A24" strokeWidth="3" />
      <text x="180" y="412" textAnchor="middle" fontSize="12.5" fill="#fff" fontWeight="800">{`나도 해보기 · ${host}`.slice(0, 44)}</text>
    </svg>
  );
}

export async function saveSvgAsPng(svg: SVGSVGElement, filename: string) {
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('IMG')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 900;
  canvas.getContext('2d')!.drawImage(img, 0, 0, 720, 900);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('BLOB');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const useSvgRef = () => useRef<SVGSVGElement>(null);
export const allCharacters = Object.values(CHARACTERS);
