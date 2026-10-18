# Roadmap

## 완료 (2026-10-16)

- [x] 로그인 e2e 검증 (이메일 가입→로그인→저장→엽전 4닢→초대 코드)
- [x] R-001 만세력 실제 계산 엔진 (astronomy-engine, 서버 전용, 결정론적)
- [x] KASI 2026 입춘/경칩 90초 이내 일치 테스트 포함 14개 테스트 통과
- [x] hash MOCK 즉시 중단, /character 등 전 화면 서버 비동기 미리보기로 교체
- [x] 음력/윤달·소멸 시각 fail-closed, 절입 ±120초 '검토 필요' 표시
- [x] 유료 풀이 버튼 비활성화 (DB active=false 유지, 잔액/이력 변경 없음, migration 없음)
- [x] build/typecheck 통과, 배포하지 않음

## 다음 단계 (운영 승인 전)

- [ ] R-015 정밀 천문 검증 추가 (더 많은 KASI 기준 연도 비교)
- [ ] 검증 완료 후 finalApproved=true 전환 및 유료 상품 active=true (사용자 승인 필요)
- [x] 음력/윤달 서버 변환 (korean-lunar-calendar, kor-lunar 교차 46,386건 일치)
- [ ] KASI 공식 음양력 API live 대조 (서비스키 필요)
- [ ] 음력 '양력에 없는 숫자 날짜' 저장 구조 (DB 변경 승인 필요)
- [ ] 영속 레이트 리밋, RLS/anon 실제 권한 테스트
- [ ] 해외 출생 시간대, 진태양시 보정 지원
