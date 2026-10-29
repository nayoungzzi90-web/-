# 오행 친구들 R-001 — 절입 시각 독립 교차검증 (개발 전용)

**상태: 연구·테스트 자료 / 운영 승인 NO-GO**

## 검증 범위

- 한국천문연구원 공개 `calendarData` 2025~2027년 12절 × 3개 연도 = **36개 분 단위 기준 시각**과 Swiss Ephemeris 2.10.03 Moshier 내장 계산(`solcross_ut`, `FLG_MOSEPH`) 대조.
- 36개 기준 모두 절대 차이 60초 이내; 최대 30.017초, 중앙값 14.1495초. 이는 **분 단위 참고값에 대한 일치**이지 KASI에서 발표한 초 단위 진실값 검증이 아니다.
- 1900~2027년 128개 연도 × 연간 12개 = **1536개 월주 경계**의 별도 참조표를 포함. 이 1536개 자체는 KASI 전수 인증이나 JPL 고정밀 천체력 인증이 아니다.
- 실제 Lovable `astronomy-engine`과 위 참조표의 오차 비교는 별도 프로젝트 테스트가 필요하다. 로컬 파일 생성만으로 Lovable 웹사이트 통합 테스트가 통과했다고 주장하지 않는다.

## 자료 형식

`solar_terms_swiss_1900_2027.json`은 `year`별 12개 **UTC Unix milliseconds** 배열이며,

0. 해당 연도 입춘
1. 경칩
2. 청명
3. 입하
4. 망종
5. 소서
6. 입추
7. 백로
8. 한로
9. 입동
10. 대설
11. **다음 연도 소한**

으로 구성한다. 즉, 2026년 **소한**은 키 `2025`의 index `11`이다.

## 실행

```bash
python audit_independent.py
```

테스트할 대상: `src/lib/saju-engine.server.ts`의 `solarTermsUtc(year)`와 1536개 절기표를 항목별 비교해 오차 분포와 worst 15를 출력하고, 년주·월주 분기 정합성을 검사한다.

## 문헌/출처

- KASI: https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2025
- KASI: https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2026
- KASI: https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2027
- Swiss Ephemeris: https://www.astro.com/swisseph/swephinfo_e.htm

**라이선스 주의:** Swiss Ephemeris는 AGPL/상용 이중 라이선스. 본 파일의 Swiss 계산은 독립 **개발 환경에서만** 시행한 것으로, 상용 Lovable 서버 런타임에 Swiss 라이브러리를 포함하면 별도 라이선스 검토가 필수다. Lovable의 서비스 계산 라이브러리는 별도의 MIT 라이선스 `astronomy-engine`으로 유지한다.

## 남은 승인 관문

1. Lovable 실행 코드와 36개 KASI 값의 직접 대조.
2. Lovable 실행 코드와 1536개 독립 참조값의 직접 대조.
3. 초 단위 높은 정밀도의 JPL 천체력 교차검증(현 환경에서 JPL 파일 미확보).
4. 1900~2026년 법정시/서머타임 및 명리학 날짜 경계 정책 확정·검증.
5. 실제 보안/속도/부하/운영 데이터 통합 검증.

어느 한 단계라도 미완료이면 R-001 `finalApproved=false`를 유지한다.
