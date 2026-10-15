# 해석 규칙 카탈로그 (상담사 검수용)

`approved_rules` 테이블에 규칙 ID 를 넣으면 해당 규칙이 만든 명제가 APPROVED 가 됩니다. 현재는 **전부 미승인 초안**입니다.

| 규칙 ID | 제목 | 영역 | 판정 논리 |
|---|---|---|---|
| R-CLM-AUTONOMY | 비겁 비중 → 자기 기준(자율성) | personality | 십성 가중 합계(월지 2배) 비겁 ≥3 이면 HIGH, 1~2 이면 CONTEXTUAL, 0 이면 LOW |
| R-CLM-EXPRESSION | 식상 비중 → 표현·재능 | personality | 식상 ≥3 HIGH, 1~2 CONTEXTUAL, 0 LOW |
| R-CLM-PRACTICALITY | 재성 비중 → 현실 감각·자원 관리 | career | 재성 ≥3 HIGH, 1~2 CONTEXTUAL, 0 LOW |
| R-CLM-STRUCTURE | 관성 비중 → 규칙·책임 감각 | career | 관성 ≥3 HIGH, 1~2 CONTEXTUAL, 0 LOW |
| R-CLM-SUPPORT | 인성 비중 → 배움·정서적 지지 | personality | 인성 ≥3 HIGH, 1~2 CONTEXTUAL, 0 LOW |
| R-CLM-TENSION-1 | 비겁·관성 모두 높음 → 자율성 대 책임 긴장 | personality | 비겁 ≥3 이고 관성 ≥3 |
| R-CLM-TENSION-2 | 식상·인성 모두 높음 → 표현 대 신중 긴장 | personality | 식상 ≥3 이고 인성 ≥3 |
| R-CLM-TENSION-3 | 재성·인성 모두 높음 → 현실 대 의미 긴장 | personality | 재성 ≥3 이고 인성 ≥3 |
| R-CLM-POWER | 자기 힘 vs 바깥 힘 → 에너지 방향(신강/신약 단순 근사) | personality | 비겁+인성 ≥ (식상+재성+관성)×1.3 이면 SELF, 반대면 OTHER, 아니면 BALANCED |
| R-CLM-SEASON | 월령(계절)이 일간 오행을 돕는가 | balance | 월지 계절 오행이 일간 오행과 같거나 일간 오행을 생(生)하면 도움 |
| R-CLM-RELATIONS | 원국 안의 천간합·육합·충 | relationship | 네 기둥 쌍마다 천간합/육합/충 여부(합화·형·파·해는 아직 다루지 않음) |
| R-CLM-GAP | 없는 오행 → 보완 포인트 | balance | 천간·지지 겉글자에 없는 오행(지장간 제외) |
| R-CLM-CORE | 오행 분포의 큰 그림 | balance | 가장 많은/적은 오행 |
| R-CLM-LOVE-PALACE | 일지(배우자궁) 십성 → 관계 선호 | love | 일지 본기 천간의 일간 기준 십성 |
| R-CLM-LOVE-STAR | 이성 인연 별(재성/관성) 개수 | love | 성별에 따라 재성(남)/관성(여), 미입력이면 둘 다. ≥2 HIGH, 0 LOW |
| R-CLM-LOVE-PALACE-REL | 일지와 다른 지지의 합충 | love | 일지와 연지·월지·시지의 육합/충 |
| R-CLM-YEARLY | 세운 간지 → 해당 연도 주제 | yearly | 세운 천간/지지 십성 + 일지·월지와의 합충. 연도 경계는 입춘(샘플 엔진은 근사) |
| R-CLM-LUCK-MISSING | 대운 계산 미제공 고지 | luck | 검증된 대운 계산이 없으면 NONE 명제로 한계만 안내 |
| R-CLM-COMPAT-DM | 두 일간의 오행·십성 관계 | compat | 일간 오행 관계(같음/생/극) + 서로의 십성 + 천간합 여부 |
| R-CLM-COMPAT-BRANCH | 두 일지의 합충 | compat | 두 일지의 육합/충 |
| R-CLM-COMPAT-MONTH | 두 월지의 합충 | compat | 두 월지의 육합/충 |
| R-CLM-COMPAT-COMPLEMENT | 오행 보완 | compat | 한쪽이 ≤1 인 오행을 상대가 ≥2 로 가진 경우 |
| R-CLM-COMPAT-AFFECTION | 각자의 일지 십성 → 애정표현 방식 | compat | 일지 본기 십성별 관계 선호 |
