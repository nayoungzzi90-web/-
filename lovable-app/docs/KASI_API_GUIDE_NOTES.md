# KASI OpenAPI 활용가이드 v1.4 (특일 정보, SpcdeInfoService) 요약 — 2026-10-18

출처: 한국천문연구원 'OpenAPI 활용가이드' v1.4 (2020-06-09 개정, 사용자 제공 docx). 원문 파일은 저장소에 넣지 않았다.

- 서비스: `SpcdeInfoService` (국경일·공휴일·24절기·잡절). 인증: 서비스 Key. REST. 활용신청은 **자동 승인**.
- 24절기 조회: `GET http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo`
  - 요청: `solYear`(필수), `solMonth`(선택), `ServiceKey`(필수), `_type=json`(선택, 기본 XML), `numOfRows`(기본 10)
  - 응답 항목: `locdate`(YYYYMMDD), `seq`, `dateKind`(03=24절기), `isHoliday`, `dateName`, `kst`(한국표준시각 HHmm, 예 `0610 `), `sunLongitude`(태양황경, 도)
  - 예시: 2019-03-06 경칩 kst 0610 황경 345 / 2019-03-21 춘분 kst 0658 황경 0
- 해상도: **분 단위**(초 없음). 따라서 우리 엔진과의 비교는 ±1분 이내 일치가 기대치이고, 그보다 정밀한 "초 단위 ground truth" 는 아니다.
- 갱신: 각 오퍼레이션 연 1회 일괄 갱신. 공휴일은 6~8월 월력요항 발표 후 차차년도까지, **24절기·기념일·잡절은 11월경 갱신** → 2028~2050년 절기는 API 에 없을 가능성이 크다.
- 한도: 문서상 초당 30 트랜잭션, 응답 약 800 bytes.
- 담당 연락처는 원문 참고(문의용).
