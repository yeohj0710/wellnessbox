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
| Home -> Explore | 364.95 -> 163.30 | 968 -> 706 | 55 -> 55 |
| Home -> Product Detail | 68.65 -> 98.65 | 349 -> 353 | 4 -> 4 |
| Explore -> Product Detail | 55.40 -> 61.70 | 274 -> 293 | 2 -> 2 |
| Home -> Chat | 150.60 -> 142.65 | 626 -> 624 | 10 -> 10 |

Notes:

- Home -> Explore, Home -> Chat hover transition improved.
- Product-detail query routes are same-segment query navigation, so gain is limited and variance is small.

## Prefetch Intent Evidence (After, hover mode)

`prefetchIntentQueuedBeforeClickAvg` from `tmp/perf/nav-after.json`:

- Home -> Explore: `0.5`
- Home -> Product Detail: `2`
- Explore -> Product Detail: `1`
- Home -> Chat: `1`

This confirms hover/focus intent handlers are invoking queued prefetch before click.

## Constrained Network Check

With `WB_PERF_CONSTRAINED=1` (effectiveType `3g`, saveData `true`), hover-mode
`prefetchIntentQueuedBeforeClickAvg` is `0` for all scenarios in
`tmp/perf/nav-after-constrained.json`.

This verifies conditional prefetch gating is active on slow/data-saver conditions.

