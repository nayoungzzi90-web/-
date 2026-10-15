# 기준 천문 데이터 재생성 (오프라인)

서비스 런타임은 `engine/manse/data/*.json` 만 읽는다. 이 폴더의 도구는 그 데이터를 만든다.

1. `de421_events.py` — **구형** 가상환경(`pip install "jplephem==2.6" de421 numpy` 후 `pip install --no-deps skyfield sgp4 certifi`)에서 실행. DE421 계수(npy) 형식은 jplephem 2.6 만 읽는다. 출력: `de421_events.json` (TT 기준 JD).
2. 24절기 Astronomy Engine 값(교차검증 B): 저장소 `engine/manse/tools/ref/ae_terms.mjs` 를 `node` 로 실행해 `ae_terms.json` 생성.
3. `finalize_events.py` — **현행** 가상환경(`pip install skyfield pyswisseph numpy`)에서 실행: TT→UTC 환산, Swiss(Moshier) 교차검증, `data/solar_terms.json`, `data/new_moons.json`, `data/verification_summary.json` 생성. `data/extra_new_moons.json`(DE421 범위 이전 합삭 1건)을 함께 읽는다.

Swiss Ephemeris 는 AGPL/상용 이중 라이선스라 **검증에만** 쓰고 코드·데이터를 저장소에 넣지 않는다(차이값만 기록).
