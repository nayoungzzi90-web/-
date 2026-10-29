# R015: 독립 OS 프로세스 2개 요청 제한 시험

상태: **실행 대기 — 미검증**. Lovable 프로젝트 크레딧 소진으로 실제 환경에서 실행하지 못했습니다.

이 두 파일을 **오직 격리된 R015 Staging Sandbox 프로젝트**의 `scripts/` 디렉터리에 추가하세요. 운영 프로젝트 Fortunes Found에 추가·실행하지 마세요. 기존 스테이징 `src/lib/rate-limit.server.ts`, `src/integrations/supabase/client.server.ts` 를 변경하지 않고 재사용합니다.

## 준비
- 격리 스테이징 Supabase 호스트의 `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_PEPPER` (32자 이상), `R015_STAGING_TEST_TOKEN` (32자 이상), 모두 **서버 런타임에서만**
- `TRUSTED_CLIENT_IP_HEADER` 는 설정하지 않습니다. IP 헤더의 프록시 재작성은 아직 검증되지 않았습니다.
- Bun이 설치되어 있고, 별도의 서버 프로세스와 루프백 포트 8081·8082 실행이 허용된 환경
- 같은 버킷을 사용하는 다른 테스트가 실행되고 있지 않을 것

명령: `bun scripts/r015-two-process-supervisor.ts`

두 개의 **서로 다른 OS 프로세스**가 루프백 서버를 열고 각각 동일한 스테이징 Supabase 요청 제한 RPC를 호출합니다. 첫 분에는 번갈아 11개 요청(200×10, 429×1), 다음 분에는 9개를 선요청한 뒤 10개를 병렬로 전송합니다(200×1, 429×9). 모든 비밀값은 런타임 변수에서만 읽고 파일이나 콘솔에 기록하지 않습니다. 테스트 중 오류가 나도 하위 프로세스를 종료합니다.

실행 후 **스테이징 DB에서만** 다음 읽기 전용 쿼리로 각 UTC 분에 `count=11`과 `count=19`, 해당 분의 버킷 개수 1개를 검증해야 합니다. 쿼리의 분 값은 스크립트가 출력한 실제 시간을 사용합니다. 원본 해시를 절대로 출력하지 않습니다.

```sql
SELECT minute_bucket, scope,
       COUNT(*)::int AS bucket_rows,
       MAX(count)::int AS request_count
FROM private_saju.rate_buckets
WHERE scope='saju_preview_unknown'
  AND minute_bucket IN (
    'REPLACE_PHASE_1_UTC_MINUTE'::timestamptz,
    'REPLACE_PHASE_2_UTC_MINUTE'::timestamptz
  )
GROUP BY minute_bucket, scope
ORDER BY minute_bucket;
```

**주의:** 스테이징 DB 카운터를 공유하는 다른 프로세스의 요청이 동시에 있으면 검증이 오염될 수 있습니다. 본 시험은 두 개의 로컬 서버 프로세스와 공유 DB의 원자성만 입증합니다. 서로 다른 호스팅 노드, Lovable 에지 프록시의 IP 헤더 재작성, 운영 환경의 안전성은 입증하지 않습니다. 스테이징 사이트는 현재 별도로 공개 게시 상태이므로 테스트를 마친 후 게시 취소/공유 링크 삭제를 점검하세요.

## 추가 완료: 로컬 격리 2-프로세스 모의 검증 (2026-10-18)
Lovable 크레딧이 소진되어 **실제 스테이징 Supabase 테스트는 아직 실행하지 못했습니다.** 대신 `scripts/local_two_process_sqlite_smoke.py`를 실행해 서로 다른 OS 프로세스 두 개가 루프백 HTTP 포트를 사용하면서 임시 **SQLite WAL** 카운터 하나를 원자적으로 공유하는지 확인했습니다. 외부 DB 키, Lovable 계정, 실제 사용자 데이터는 사용하지 않습니다.

```bash
python3 scripts/local_two_process_sqlite_smoke.py
```

검증 결과: 첫 번째 시나리오에서 10회 허용·11번째 차단, 두 번째 시나리오에서 9회 선요청 후 10개 동시 요청 중 1개만 허용·9개 차단, 로컬 카운터 각각 11/19, 모든 테스트 프로세스 종료와 임시 DB 삭제에 성공했습니다. 이 검증은 **SQLite에 구현한 독립적인 모형 테스트**이며, PostgreSQL/Supabase RPC 자체, Lovable 호스팅 서버 2개, 프록시 IP 헤더 신뢰, 운영 배포를 입증하지 않습니다. 실제 검증용 Bun TypeScript 파일은 원래 구성대로 포함되어 있고 **스테이징에서 미실행**입니다.

크레딧이 복구되면 먼저 스테이징 프로젝트에 원래 두 TypeScript 파일을 배치하고, 실제 스테이징 Supabase에 연결하여 두 OS 프로세스의 HTTP 결과와 DB 버킷별 카운터 11/19를 교차검증해야 합니다. 운영 프로젝트에서는 이 스크립트를 실행하지 마세요.
