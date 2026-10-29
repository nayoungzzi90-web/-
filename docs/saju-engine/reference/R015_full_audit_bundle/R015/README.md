# OHENG Friends R-015 draft package

This is a **reference release/audit gate**, not a production-ready app or an implementation of the astronomical calendar.

Contents:
- `R015_spec.md`: detailed Korean QA and release design.
- `src/release_gate.ts`: deterministic product-scoped verification gate.
- `tests/release_gate_tests.ts`: synthetic scenarios (no DB, no live service).
- `supabase/migrations/202610160001_r015_guardrails.sql`: example RLS/grants/ledger migration. **Review first.**
- `supabase/tests/r015_rls_reference.sql`: pgTAP starter; requires Supabase local DB and helper extension.
- `fixtures/calendar_boundary_cases.csv`: a checklist with intentionally blank expected pillars.
- `fixtures/baseline_manifest.json`: initial NO_GO fact sheet.
- `ci/r015_example.yml`: CI reference.

Test locally (Node.js + tsc available):

```bash
tsc --strict --target es2022 --module commonjs --lib es2022,dom --rootDir . --outDir build src/release_gate.ts tests/release_gate_tests.ts
node build/tests/release_gate_tests.js
```

Do not use synthetic test approval flags in production. The server must derive all approvals from a protected approval registry and linked artifacts.

Never run `supabase db reset --linked` on production.
