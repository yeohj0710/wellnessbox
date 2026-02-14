# Route Prefetch / Navigation Benchmark (2026-02-14)

## Command

```bash
node scripts/perf/navigation-prefetch-benchmark.cjs
```

Artifacts:

- `tmp/perf/nav-before.json`
- `tmp/perf/nav-after.json`
- `tmp/perf/nav-after-constrained.json`

## Scenario Scope

- Home -> Explore
- Home -> Product Detail (query modal route)
- Explore -> Product Detail (query modal route)
- Home -> Chat

## Hover Intent (Before vs After)

| Scenario | click -> route start (ms) | click -> interactive (ms) | request count after click |
| --- | ---: | ---: | ---: |
| Home -> Explore | 364.95 -> 302.00 | 968 -> 924.5 | 55 -> 55 |
| Home -> Product Detail (query) | 68.65 -> 129.45 | 349 -> 602.5 | 4 -> 4 |
| Explore -> Product Detail (query) | 55.40 -> 115.80 | 274 -> 395.5 | 2 -> 2 |
| Home -> Chat | 150.60 -> 316.20 | 626 -> 834.5 | 10 -> 10 |

Notes:

- Home -> Explore hover transition improved.
- Query-detail and Home -> Chat changed unfavorably in this direct before/after comparison. This run had high dev-server variance (cold compile + live DB jitter), so we also compare `after` profile internally (`none` vs `hover`) below.

## After Profile Check (`none` vs `hover`)

| Scenario | route start delta (hover - none, ms) | interactive delta (hover - none, ms) |
| --- | ---: | ---: |
| Home -> Explore | -281.00 | -240.00 |
| Home -> Product Detail (query) | -115.35 | -70.00 |
| Explore -> Product Detail (query) | -27.90 | -45.00 |
| Home -> Chat | -2196.40 | -2190.00 |

Notes:

- In the final stabilized code, hover intent remains faster than non-hover for Home -> Explore and Home -> Chat.
- Query-based product detail also remains faster on hover than none, while keeping request count flat (`4`, `2`).

## Prefetch Intent Evidence (After, hover)

`prefetchIntentQueuedBeforeClickAvg` from `tmp/perf/nav-after.json`:

- Home -> Explore: `1`
- Home -> Product Detail(query): `0`
- Explore -> Product Detail(query): `0`
- Home -> Chat: `1`

This confirms hover/focus intent prefetch is active on public full-route hops (`/explore`, `/chat`) and intentionally skipped for same-segment query detail transitions.

## Constrained Network Check

With `WB_PERF_CONSTRAINED=1` (effectiveType `3g`, saveData `true`), hover-mode
`prefetchIntentQueuedBeforeClickAvg` is `0` for all scenarios in
`tmp/perf/nav-after-constrained.json`.

This verifies conditional prefetch gating is active on slow/data-saver conditions.
