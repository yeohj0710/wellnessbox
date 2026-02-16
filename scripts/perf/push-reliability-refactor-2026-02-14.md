# Push Reliability/Performance Refactor (2026-02-14)

## 1) Measurement Artifacts

- Original before snapshot (pre-refactor run):
  - `scripts/perf/push-benchmark-before-2026-02-14.json`
- Baseline config on current code (dedupe/cleanup off, concurrency=1, retry=0):
  - `scripts/perf/push-benchmark-baseline-config-2026-02-14.json`
- After refactor config (dedupe/cleanup on, concurrency=8, retry=1):
  - `scripts/perf/push-benchmark-after-2026-02-14.json`
- Repro script:
  - `scripts/perf/push-notification-benchmark.cjs`
  - run: `npm run perf:push-benchmark`

## 2) Before/After Summary (Original Before vs After)

| Metric | Before | After |
|---|---:|---:|
| fanout p50 (3-case avg, ms) | 1486.6 | 1504.0 |
| fanout p95 (3-case avg, ms) | 3376.0 | 1723.2 |
| fanout avg (3-case avg, ms) | 1757.0 | 1525.6 |
| total send attempts (3 cases x 7 runs) | 414 | 525 |
| total send success | 378 | 378 |
| total send failure | 36 | 147 |
| duplicate probe second-call attempts | 19 | 0 |

Notes:
- `After` retries transient failures 1 time (`WB_PUSH_SEND_RETRIES=1`), so attempts/failures are counted more strictly.
- Duplicate suppression changed from **not blocked** to **blocked** at event key level.

## 3) DB Call Comparison (Comparable Config Pair)

Comparable pair:
- baseline config: dedupe/cleanup off (`WB_PUSH_ENABLE_DEDUPE=0`, `WB_PUSH_CLEAN_DEAD=0`, `WB_PUSH_SEND_CONCURRENCY=1`, `WB_PUSH_SEND_RETRIES=0`)
- after config: dedupe/cleanup on (defaults)

| Metric (3-case avg) | Baseline Config | After Config |
|---|---:|---:|
| DB queries per run | ~8.1 | ~20.6 |
| DB writes per run | 0 | 3 |

Reason:
- After config includes dedupe gate write + delivery status update + dead-endpoint invalidation write.

## 4) `[push]` Log Format

Main structured logs:
- `[push] subscription.fetch`:
  - `{ label, rawCount, dedupedCount, elapsedMs }`
- `[push] send.start`:
  - `{ label, role, eventKey, subscriptionCount, concurrency, retryCount, dedupeEnabled, deadCleanupEnabled }`
- `[push] send.complete`:
  - `{ label, role, eventKey, sendAttempts, sentCount, failedCount, dedupedCount, deadEndpointCount, failureByType, elapsedMs }`
- `[push] send.deduped`:
  - `{ label, role, eventKey, elapsedMs }`
- `[push] route.push.send.ok|bad_request|error`:
  - route-level request timing and error metadata

Prisma query timing (dev flag):
- enable query events: `WB_PRISMA_QUERY_LOG=1`
- print each query: `WB_PRISMA_QUERY_LOG_STDOUT=1`
- log prefix: `[push][db] query`

## 5) Manual Flow Check

1. Customer order-complete flow:
   - checkout complete -> customer subscription -> `/api/push/send`
   - verify one event re-fire does **not** resend (`send.deduped`)
2. Pharmacy dashboard flow:
   - subscribe/status/unsubscribe via `/api/pharm-push/*`
   - trigger `sendNewOrderNotification` and verify fanout logs
3. Rider dashboard flow:
   - subscribe/status/unsubscribe via `/api/rider-push/*`
   - trigger `sendRiderNotification` and verify fanout logs
4. Dead endpoint cleanup:
   - simulate 404/410 endpoint
   - verify `Subscription.invalidatedAt` and `lastFailureStatus` are updated
