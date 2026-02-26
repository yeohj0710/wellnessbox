# Agent Preflight Checklist

Purpose: speed up new coding sessions by checking structural risks first, before feature work.

## 1) Fast Baseline

Run these in order:

```bash
npm run audit:encoding
npm run audit:hotspots
npm run lint
npm run build
# Optional (DB-connected env): client ID linkage/quality audit
npm run audit:clients
# Optional (C~E regression smoke): column/employee-report/b2b-export
npm run qa:cde:regression
# Optional (local auto-runner): start/reuse dev server then run C~E regression
npm run qa:cde:regression:local
# Optional (B2B score-engine safety): missing/fallback/risk derivation checks
npm run qa:b2b:score-engine
# Optional (B2B export smoke): validation + PPTX/PDF status
npm run qa:b2b:export-smoke
```

Or run one command:

```bash
npm run preflight:agent
```

If `npm run build` fails at `prisma:generate` with `EPERM ... query_engine ... rename` on Windows:
- Close processes that may hold Prisma engine files (for example Prisma Studio or other Node processes using Prisma).
- Re-run `npm run prisma:generate`.
- The command now auto-retries with backoff and prints a focused lock message.

`audit:encoding` gives:
- mojibake and suspicious broken-text pattern checks across text/code files

`audit:hotspots` gives:
- runtime code hotspots + script hotspots by line count (refactor candidates)
- critical route guard checks for admin/rag/push endpoints

`audit:clients` gives (optional):
- client cookie/client row/user linkage quality trends
- short-lived client ratio and user-agent concentration for hygiene checks

## 2) Non-Negotiable Invariants

- Route auth/ownership must use `lib/server/route-auth.ts` guards.
- Order stock mutation must stay in `lib/order/mutations.ts:createOrder` transaction.
- Prisma client must stay singleton via `lib/db.ts`.
- User-facing UI copy defaults to Korean (`ko-KR`) unless explicitly requested otherwise.
- Admin gate must stay aligned across:
  - `app/api/verify-password/route.ts`
  - `lib/admin-token.ts`
  - `middleware.ts`

## 3) High-Impact Hotspots

When touching these files, prefer block-level extraction over in-place growth:

- `app/chat/hooks/useChat.ts`
- `app/(components)/homeProductSection.tsx`
- `lib/chat/context.ts`
- `components/order/orderDetails.tsx`
- `app/my-data/page.tsx`
- `app/chat/components/recommendedProductActions.utils.ts`

## 4) Refactor Rule of Thumb

- Split only when boundaries are clear (pure helper, UI fragment, parser/mapper).
- Keep behavior equivalent first; optimize behavior in a separate pass.
- For auth/order/push changes, do manual flow checks after build:
  - login
  - checkout complete
  - my-orders lookup
  - push subscribe/status

## 5) Navigation Shell Notes

- `lib/useLoginStatus.ts` is the canonical source for `LoginStatus` type + normalization.
- Chat action planner split:
  - `app/api/chat/actions/route.ts` = model call + request/response orchestration
  - `lib/chat/action-intent-rules.ts` = regex intent rules + runtime-context flags + fallback action feedback
- Chat hook split:
  - `app/chat/hooks/useChat.ts` = lifecycle orchestration + state wiring
  - `app/chat/hooks/useChat.agentGuide.ts` = capability ranking + guide examples
  - `app/chat/hooks/useChat.sendMessageFlow.ts` = send branch selection
  - `app/chat/hooks/useChat.actionFlow.ts` = cart/action decision branch handlers
  - `app/chat/hooks/useChat.copy.ts` = chat copy constants + error text mapping
  - `app/chat/hooks/useChat.lifecycle.ts` = bootstrap data loaders
  - `app/chat/hooks/useChat.bootstrap.ts` = bootstrap effect wrappers
  - `app/chat/hooks/useChat.ui.ts` = drawer/scroll helpers
  - `app/chat/hooks/useChat.interactionGuard.ts` = duplicate action guard
  - `app/chat/hooks/useChat.derived.ts` = summary/context payload builders + guide visibility logic
- Chat message bubble split:
  - `app/chat/components/MessageBubble.tsx` = bubble shell + loading/copy interaction orchestration
  - `app/chat/components/messageBubble.markdown.tsx` = markdown plugin list + renderer map/image fallback policy
  - `app/chat/components/messageBubble.format.ts` = message text normalization helper
- Desktop dock split:
  - `components/chat/DesktopChatDock.tsx` = dock shell and trigger
  - `components/chat/DesktopChatDockPanel.tsx` = UI composition shell
  - `components/chat/useDesktopChatDockLayout.ts` = layout state + viewport clamp + dock layout emit
  - `components/chat/useDesktopChatDockPointer.ts` = pointer move loop + drag/resize commit/persist
  - `components/chat/DesktopChatDock.layout.ts` = geometry/storage/event primitives
  - `components/chat/DesktopChatDockPanelHeader.tsx` = dock header actions
  - `components/chat/DesktopChatDockResizeOverlay.tsx` = resize hint and handles
  - `components/chat/DesktopChatDockPanel.loading.ts` = loading metadata helper
  - `components/chat/DesktopChatDockMessageFeed.tsx` = message feed composition
- Home product section split:
  - `app/(components)/homeProductSection.tsx` = page-level orchestration and UI composition
  - `app/(components)/homeProductSection.helpers.ts` = filter/cart/cache pure helpers
  - `app/(components)/homeProductSection.copy.ts` = package labels + user-facing copy constants
  - `app/(components)/useHomeProductPharmacy.ts` = nearby pharmacy resolve/retry state machine
  - `app/(components)/useHomeProductActions.ts` = detail/cart open-close + return-route/scroll restore callbacks
  - `app/(components)/useHomeProductSectionEffects.ts` = stable effect-hook barrel import surface
  - `app/(components)/useHomeProductSectionEffects.ui.ts` = cart/hash/open-cart/footer sync effects
  - `app/(components)/useHomeProductSectionEffects.query.ts` = package/category/product/cart query-sync effects
  - `app/(components)/useHomeProductSectionEffects.lifecycle.ts` = bootstrap/cache/recovery/address lifecycle effects
  - `app/(components)/useHomeProductSectionEffects.computation.ts` = totals/filter/cart-prune/symptom-category computation effects
  - `app/(components)/homeProductSectionEffects.types.ts` = shared effect input type aliases
- My-data page split:
  - `app/my-data/page.tsx` = route-level guard + section composition
  - `app/my-data/myDataPageData.ts` = session/actor/appUser + my-data query orchestration
- Order-complete page split:
  - `app/(orders)/order-complete/page.tsx` = payment verification + order-create orchestration + notification UI
  - `app/(orders)/order-complete/orderCompleteFlow.ts` = payment context/order draft parsing + payment outcome normalization + checkout/payment storage cleanup
- Header/nav ownership:
  - `components/common/topBar.tsx` = shell orchestration (route transitions + action wiring)
  - `components/common/topBar.header.tsx` = top header rendering
  - `components/common/topBar.drawer.tsx` = drawer rendering + overlay
  - `components/common/topBar.hooks.ts` = login/cart/scroll/logo hooks
  - `components/common/menuLinks.tsx` = menu controller state (admin reveal, AI dropdown, timers)
  - `components/common/menuLinks.desktop.tsx` = desktop menu rendering
  - `components/common/menuLinks.drawer.tsx` = drawer menu rendering
  - `components/common/menuLinks.shared.tsx` = shared badges/visibility/operator links
- If updating menu policy, keep desktop and drawer variants in sync.

## 6) Push Subscriptions

- `lib/notification/subscriptions.ts` uses typed `PushSubscriptionPayload` + shared DB/log helpers.
- Keep route-level ownership guards intact; only persistence/logging logic belongs there.
- Push fanout ownership map:
  - `lib/notification/core.ts` = fanout orchestration + subscription/order summary fetch
  - `lib/notification/core.runtime.ts` = env/runtime policy + concurrency helpers
  - `lib/notification/core.error.ts` = push/prisma error classification guards
  - `lib/notification/core.delivery-gate.ts` = dedupe gate/finalize/dead-endpoint cleanup
  - `lib/notification/core.types.ts` = shared push role/target/outcome contracts

## 7) Result Normalizer Map

- Keep assessment/check-ai normalizer boundaries explicit:
  - `lib/server/result-normalizer.ts` = stable export surface only
  - `lib/server/result-normalizer.types.ts` = snapshot/result types + version constants
  - `lib/server/result-normalizer.shared.ts` = shared parsing/normalization primitives
  - `lib/server/result-normalizer.assess.ts` = assess question/score snapshots + summary
  - `lib/server/result-normalizer.check-ai.ts` = check-ai snapshot/score normalization
- If adding a new snapshot schema, extend `types` first, then wire assess/check-ai module.

## 8) Product Query Map

- Keep product boundaries explicit:
  - `lib/product/product.ts` = stable export surface + chat catalog pricing selection logic
  - `lib/product/product.shared.ts` = shared product where/select/order constants + rating-default mapper
  - `lib/product/product.catalog.ts` = home/list/name/summary product query paths
  - `lib/product/product.admin.ts` = admin CRUD + relation-id connect mapper
- In `use server` files, prefer async wrapper exports over direct re-export syntax.

## 9) NHIS Normalize Map

- Keep normalization responsibilities separated by module:
  - `lib/server/hyphen/normalize.ts`: top-level orchestrator/composer only
  - `lib/server/hyphen/normalize-shared.ts`: primitive/object/list helpers
  - `lib/server/hyphen/normalize-treatment.ts`: medical/medication flattening
  - `lib/server/hyphen/normalize-checkup.ts`: checkup list/yearly/overview shaping
  - `lib/server/hyphen/normalize-health-age.ts`: health-age summary projection
- `lib/server/hyphen/normalize-recommendation.ts`: recommendation timeline/caution derivation
- If adding a new NHIS target, add a dedicated normalize module first, then wire it in `normalize.ts`.

## 10) Health-Link Utility Map

- Keep `/health-link` utility boundaries explicit:
  - `app/(features)/health-link/utils.ts`: barrel export only (stable import surface)
  - `app/(features)/health-link/utils-format.ts`: label/date/table/json formatting helpers
  - `app/(features)/health-link/utils-session.ts`: session-expiry + fetch-failure message policy
- `app/(features)/health-link/utils-health-data.ts`: checkup/medication summarization logic
- For UI overflow bugs, prefer CSS containment/wrapping fixes in `HealthLinkClient.module.css` before changing data contracts.

## 11) Payment Verification Map

- Keep payment provider boundaries explicit:
  - `app/api/get-payment-info/route.ts` = request validation + provider-path orchestration + normalized error response shape
  - PortOne v1 (`inicis`) and v2 lookups should remain isolated helper paths to reduce token/response parsing drift.
- If adding payment methods, extend request validation first and then add provider helper branch.

## 12) Assess Storage Map

- Keep assess persistence boundaries explicit:
  - `app/assess/page.tsx` = question flow/evaluation orchestration only
  - `app/assess/lib/assessStorage.ts` = localStorage snapshot load/save/clear + C-section previous-step rollback
- If adjusting assess persistence shape, update storage helper contracts before page orchestration logic.

## 13) Client Link Map

- Keep client-link identity boundaries explicit:
  - `lib/server/client-link.ts` = request attach/resolve orchestration surface
  - `lib/server/client-link.session.ts` = session-context resolution + appUser-client lookup
  - `lib/server/client-link.merge.ts` = preferred-client selection + cross-client data merge + masked logging helper
- For merge-policy edits, update `client-link.merge.ts` first and keep `client-link.ts` focused on flow orchestration.

## 14) Hyphen Client Map

- Keep Hyphen transport boundaries explicit:
  - `lib/server/hyphen/client.ts` = stable export surface + endpoint wrapper composition
  - `lib/server/hyphen/client.contracts.ts` = endpoint constants + request/response/common contract types
  - `lib/server/hyphen/client.runtime.ts` = env/auth timeout and common/step/cookie parsing helpers
  - `lib/server/hyphen/client.request.ts` = `hyphenPost` transport + `HyphenApiError` classification
- When adding endpoint wrappers, wire endpoint constants in `client.contracts.ts` first, then register wrapper export in `client.ts`.

## 15) NHIS Executor Map

- Keep NHIS fetch executor boundaries explicit:
  - `lib/server/hyphen/fetch-executor.ts` = fetch target orchestration, failure marking, and payload assembly
  - `lib/server/hyphen/fetch-executor.helpers.ts` = year/detail-key parsing, payload list merge, medication probe-window derivation
- If changing fetch sequencing/policy, edit `fetch-executor.ts`; if changing parsing windows/keys/year handling, edit `fetch-executor.helpers.ts`.

## 16) Module07 MVP Map

- Keep Module07 deterministic runtime boundaries explicit:
  - `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.ts` = end-to-end orchestration, validation loop, wiring/output assembly
  - `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.shared.ts` = run-id/source/sensitivity/group/sort/source-summary helpers
  - `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.artifacts.ts` = session artifact payload + evidence + lineage builders
- If editing algorithm contracts, keep builders in `mvp-engine.artifacts.ts` aligned first, then wire orchestration in `mvp-engine.ts`.

## 17) B2B Score Engine Map

- 점수 산출 분리 경계:
  - `lib/b2b/report-score-engine.ts` = 점수 산출 오케스트레이션(우선순위/결측 처리/사유(detail) 구성)
  - `lib/b2b/report-score-profile.ts` = 가중치/상태별 점수/위험도 밴드 정책
  - `lib/b2b/report-payload.ts` = DB 조회 오케스트레이션 + payload 조립
  - `lib/b2b/report-payload-analysis.ts` = analysis payload 파싱/정규화(요약/설문/검진/추이/AI)
  - `lib/b2b/report-payload-types.ts` = 최종 payload 계약 타입
- 점수 정책 교체는 프로파일 파일부터 수정하고, 엔진은 가능한 한 조합만 담당하게 유지.
- 상세 가이드: `docs/b2b_report_payload_map.md`

## 18) C~E QA Selector Map

- `scripts/qa/verify-cde-regression.cjs`는 employee-report 자동검증 시 텍스트 매칭 대신 `data-testid`를 우선 사용.
- selector 계약 문서: `docs/qa_cde_regression_selectors.md`
- UI 리팩터 시 selector 변경이 필요하면, QA 스크립트와 문서를 반드시 한 번에 동기화.

## 19) B2B Admin Report Client Map

- `admin/b2b-reports` 경계:
  - 오케스트레이션: `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
  - UI 블록:
    - `app/(admin)/admin/b2b-reports/_components/B2bAdminOpsHero.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bEmployeeSidebar.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bEmployeeOverviewCard.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorPanel.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bNoteEditorPanel.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bAnalysisJsonPanel.tsx`
    - `app/(admin)/admin/b2b-reports/_components/B2bLayoutValidationPanel.tsx`
  - 설문 입력 필드 UI: `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.tsx`
  - 클라이언트 타입: `app/(admin)/admin/b2b-reports/_lib/client-types.ts`
  - 클라이언트 API: `app/(admin)/admin/b2b-reports/_lib/api.ts`
  - 클라이언트 유틸: `app/(admin)/admin/b2b-reports/_lib/client-utils.ts`
  - 공용 payload 타입: `lib/b2b/report-summary-payload.ts`
- 상세 가이드: `docs/b2b_admin_report_client_map.md`

## 20) B2B Report Summary Map

- `components/b2b/ReportSummaryCards.tsx`는 표현/뷰모델 조합 중심으로 유지.
- 파생 데이터 계산/정규화는 `components/b2b/report-summary/view-model.ts`에서 처리.
- 공용 표시 헬퍼는 `components/b2b/report-summary/helpers.ts`에서 유지.
- payload 계약 변경은 `lib/b2b/report-summary-payload.ts`부터 수정 후 컴파일 에러를 따라 반영.
- score 정책 변경은 `lib/b2b/report-score-profile.ts`, `lib/b2b/report-score-engine.ts`에서 처리.
- 상세 가이드: `docs/b2b_report_summary_map.md`

## 21) Column Editor Map

- `/admin/column/editor` 유지보수 경계:
  - 오케스트레이션: `app/(admin)/admin/column/editor/EditorAdminClient.tsx`
  - UI 블록:
    - `app/(admin)/admin/column/editor/_components/ColumnEditorHeader.tsx`
    - `app/(admin)/admin/column/editor/_components/ColumnPostListSidebar.tsx`
    - `app/(admin)/admin/column/editor/_components/ColumnEditorWorkspace.tsx`
  - 타입 계약: `app/(admin)/admin/column/editor/_lib/types.ts`
  - API 호출: `app/(admin)/admin/column/editor/_lib/api.ts`
  - 순수 유틸: `app/(admin)/admin/column/editor/_lib/utils.ts`
- 상세 가이드: `docs/column_editor_client_map.md`

## 22) Employee Report Client Map

- `/employee-report` 유지보수 경계:
  - 오케스트레이션: `app/(features)/employee-report/EmployeeReportClient.tsx`
  - 타입 계약: `app/(features)/employee-report/_lib/client-types.ts`
  - API 경계: `app/(features)/employee-report/_lib/api.ts`
  - 요청/가이드 유틸: `app/(features)/employee-report/_lib/client-utils.ts`
  - UI 블록:
    - `app/(features)/employee-report/_components/EmployeeReportIdentitySection.tsx`
    - `app/(features)/employee-report/_components/EmployeeReportSummaryHeaderCard.tsx`
    - `app/(features)/employee-report/_components/EmployeeReportSyncGuidanceNotice.tsx`
- 상세 가이드: `docs/employee_report_client_map.md`
