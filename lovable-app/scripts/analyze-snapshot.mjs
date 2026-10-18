#!/usr/bin/env node
// R015 운영 읽기 전용 스냅샷(JSON) 자동 점검. 사용: node scripts/analyze-snapshot.mjs snapshot.json
// 판정은 "사람이 읽을 근거"일 뿐 운영 승인이 아니다. 함수 본문(돈·초대 로직)은 사람이 직접 읽어야 한다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const WRITE = new Set(["INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]);
const FUNCS = ["spend_coins", "ensure_user_setup", "apply_invite"];

export function analyze(s) {
  const out = [];
  const add = (level, msg) => out.push({ level, msg });

  // 1) 권한
  const g = s.grants ?? [];
  for (const role of ["anon", "authenticated", "PUBLIC"]) {
    const byTable = {};
    for (const x of g.filter((x) => x.grantee === role))
      (byTable[x.table] ??= []).push(x.privilege);
    for (const [t, privs] of Object.entries(byTable)) {
      const w = privs.filter((p) => WRITE.has(p));
      if (role === "anon" && privs.length)
        add("WARN", `anon 이 ${t} 에 표 수준 권한 보유: ${privs.join(",")} (최소 권한 SQL 대상)`);
      else if (role !== "anon" && w.length && t !== "birth_profiles")
        add(
          "WARN",
          `${role} 이 ${t} 에 쓰기성 권한 보유: ${w.join(",")} (RLS가 막더라도 심층 방어 부족)`,
        );
      else if (
        role !== "anon" &&
        privs.some((p) => ["TRUNCATE", "REFERENCES", "TRIGGER"].includes(p))
      )
        add("WARN", `${role} 이 ${t} 에 TRUNCATE/REFERENCES/TRIGGER 보유`);
    }
  }
  // 2) RLS
  for (const t of s.tables ?? []) {
    if (!t.rls_enabled) add("FAIL", `${t.table}: RLS 꺼짐`);
    else {
      const n = (s.policies ?? []).filter((p) => p.table === t.table).length;
      if (n === 0 && t.table !== "reading_price_catalog")
        add("INFO", `${t.table}: RLS 켜짐, 정책 없음(클라이언트 접근 전면 차단)`);
    }
  }
  // 3) 함수
  for (const name of FUNCS) {
    const f = (s.functions ?? []).find((x) => x.name === name);
    if (!f) {
      add("FAIL", `함수 ${name} 가 없음`);
      continue;
    }
    if (!f.security_definer) add("WARN", `${name}: SECURITY DEFINER 아님`);
    const cfg = (f.config ?? []).join(" ");
    if (f.security_definer && !/search_path=/.test(cfg))
      add("FAIL", `${name}: SECURITY DEFINER 인데 search_path 미고정(권한 상승 위험)`);
    if (!/auth\.uid\(\)/.test(f.definition ?? ""))
      add("WARN", `${name}: 본문에 auth.uid() 가 안 보임 — 호출자 식별 방식을 사람이 확인`);
  }
  for (const f of s.function_execute ?? []) {
    if (f.exists && f.anon === true) add("FAIL", `${f.function}: anon 이 실행 가능`);
  }
  // 4) 요청 제한 미적용(적용 전이면 정상)
  const rl = s.rate_limit_applied ?? {};
  add(
    "INFO",
    rl.schema_private_saju_exists || rl.rate_buckets_exists
      ? "요청 제한 객체가 이미 존재함 — 적용 이력 확인 필요"
      : "요청 제한 SQL 미적용(적용 전 상태, 예상과 일치)",
  );
  const rpc = (s.function_execute ?? []).find((f) => f.function.includes("saju_rate_limit_hit"));
  if (rpc?.exists) add("WARN", "saju_rate_limit_hit 가 이미 존재");
  // 5) 데이터 정합성
  const c = s.counts ?? {};
  if ((s.wallet_stats?.negative_count ?? 0) > 0)
    add("FAIL", `음수 잔액 지갑 ${s.wallet_stats.negative_count}개`);
  const iv = s.invite_stats ?? {};
  if (iv.max_rewards_per_inviter_per_kst_day > 5)
    add("FAIL", `초대 보상이 하루 ${iv.max_rewards_per_inviter_per_kst_day}건(한도 5 초과)`);
  if (iv.max_rewards_per_inviter_per_kst_month > 30)
    add("FAIL", `초대 보상이 월 ${iv.max_rewards_per_inviter_per_kst_month}건(한도 30 초과)`);
  if (iv.self_invite_rows > 0) add("FAIL", `자기 초대 보상 ${iv.self_invite_rows}건`);
  if (iv.invitees_rewarded_more_than_once > 0)
    add("FAIL", `한 명이 여러 번 보상 대상이 된 초대 ${iv.invitees_rewarded_more_than_once}건`);
  const an = s.anomalies ?? {};
  if (an.duplicate_invite_codes > 0) add("FAIL", `중복 초대 코드 ${an.duplicate_invite_codes}개`);
  if (an.users_with_multiple_invite_codes > 0)
    add("WARN", `초대 코드를 여러 개 가진 사용자 ${an.users_with_multiple_invite_codes}명`);
  // 6) 유료 상품
  for (const p of s.price_catalog ?? [])
    if (p.active)
      add("FAIL", `유료 상품 ${p.reading_type} 이 active=true (승인 전에는 false 여야 함)`);
  add("INFO", `행 수: ${JSON.stringify(c)}`);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) {
    console.error("사용: node scripts/analyze-snapshot.mjs snapshot.json");
    process.exit(1);
  }
  let raw = readFileSync(file, "utf8").trim();
  // SQL 에디터가 칸 값을 따옴표로 감싸 내보낸 경우 대비
  if (raw.startsWith('"') && raw.endsWith('"')) raw = JSON.parse(raw);
  const s = typeof raw === "string" ? JSON.parse(raw) : raw;
  const out = analyze(s);
  for (const o of out) console.log(`[${o.level}] ${o.msg}`);
  console.log(
    `\nFAIL ${out.filter((o) => o.level === "FAIL").length} / WARN ${out.filter((o) => o.level === "WARN").length} / INFO ${out.filter((o) => o.level === "INFO").length}`,
  );
}
