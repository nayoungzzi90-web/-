import { useRef, useState } from 'react';
import { CharacterBase, CharacterResult, CHARACTERS } from '../lib/content/characters';
import { ELEMENT_KO } from '../lib/saju/types';

/**
 * 캐릭터 일러스트 슬롯: public/characters/{id}.webp 에 독자 제작 에셋을 넣고 VITE_CHARACTER_ASSETS=true 로 켠다.
 * 에셋이 없으면 코드로 그린 임시 플레이스홀더(원본 저작물 복제 아님)를 보여준다.
 */
const HAS_ASSETS = String(import.meta.env.VITE_CHARACTER_ASSETS).toLowerCase() === 'true';

export function CharacterArt({ base, size = 200, className = 'art' }: { base: CharacterBase; size?: number; className?: string }) {
  const [useImg, setUseImg] = useState(HAS_ASSETS);
  if (useImg) {
    return <img className={className} src={`/characters/${base.id}.webp`} alt={base.name} width={size} height={size} onError={() => setUseImg(false)} />;
  }
  return (
    <svg className={className} viewBox="0 0 200 200" role="img" aria-label={`${base.name} (임시 일러스트)`} width={size} height={size}>
      <defs>
        <radialGradient id={`g-${base.id}`} cx="50%" cy="40%" r="70%"><stop offset="0%" stopColor="#FFFBF2" /><stop offset="100%" stopColor={base.color} stopOpacity=".28" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill={`url(#g-${base.id})`} stroke={base.color} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      <path d="M52 74 Q100 28 148 74 L140 82 Q100 54 60 82 Z" fill="#302C2B" opacity=".9" />
      <ellipse cx="100" cy="42" rx="34" ry="8" fill="#302C2B" opacity=".9" />
      <text x="100" y="124" textAnchor="middle" fontSize="78" dominantBaseline="middle">{base.emoji}</text>
      <rect x="60" y="150" width="80" height="22" rx="11" fill={base.color} opacity=".92" />
      <text x="100" y="161" textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="#fff" fontWeight="700">{base.stem} · {ELEMENT_KO[base.element]}</text>
    </svg>
  );
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
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 450" width="100%" role="img" aria-label="공유 카드 미리보기" style={{ borderRadius: 16, border: '1px solid #E0D3B8', display: 'block' }}>
      <rect width="360" height="450" fill="#F8F2E6" />
      <rect x="12" y="12" width="336" height="426" rx="14" fill="none" stroke={base.color} strokeWidth="2" strokeDasharray="3 6" />
      <text x="180" y="52" textAnchor="middle" fontSize="15" fill="#7A5A22" fontWeight="700">{result.epithet}</text>
      <text x="180" y="86" textAnchor="middle" fontSize="26" fill="#302C2B" fontWeight="800">{alias ? `${alias}의 ` : ''}{base.name}</text>
      <circle cx="180" cy="206" r="96" fill={base.color} opacity=".16" />
      <text x="180" y="226" textAnchor="middle" fontSize="110">{base.emoji}</text>
      <text x="180" y="334" textAnchor="middle" fontSize="15" fill="#302C2B">{base.summary}</text>
      <text x="180" y="362" textAnchor="middle" fontSize="14" fill={base.color} fontWeight="700">{base.shareLine}</text>
      <rect x="40" y="388" width="280" height="34" rx="17" fill="#8A3F3B" />
      <text x="180" y="410" textAnchor="middle" fontSize="12.5" fill="#fff" fontWeight="700">{`나도 해보기 · ${host}`.slice(0, 44)}</text>
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
