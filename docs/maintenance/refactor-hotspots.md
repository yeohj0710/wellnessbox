# Refactor Hotspots (Agent Handoff)

Last validated: 2026-02-26

This document tracks large/complex files that are most likely to slow down follow-up sessions.

## Prioritized Runtime Targets

1. `app/chat/hooks/useChat.ts`
   - High state density + side effects.
   - Suggested split: network orchestration, state selectors, UI event handlers.
2. `app/(components)/homeProductSection.tsx`
   - Large render tree and interaction logic in one file.
   - Suggested split: list item card, filter bar, sorting/paging model.
3. `components/order/orderDetails.tsx`
   - Dense conditional UI logic.
   - Suggested split: status panel, payment panel, line-items table.
4. `app/chat/components/recommendedProductActions.resolve.ts`
   - Recommendation resolver with catalog matching + price scoring.
   - Suggested split: matching rules and IO/cache boundary.
5. `lib/ai/chain.ts`
   - Core AI chain orchestration with broad responsibilities.
   - Suggested split: prompt construction, context gathering, and post-processing.
6. `lib/b2b/export/layout-dsl.ts`
   - Large DSL construction logic with mixed concerns (layout structure + render semantics).
   - Suggested split: page block builders, style-token mapping, and preset composition.
7. `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
   - Admin report page still combines filter state, fetch orchestration, and rendering concerns in one file.
   - Suggested split: query-state model hook, table/list presentation blocks, and export action controller.
8. `lib/server/hyphen/fetch-ai-summary-core.ts`
   - NHIS summary orchestration contains prompt IO and business fallback logic together.
   - Suggested split: input policy assembly, model call adapter, and post-merge serializer.
9. `app/api/messages/stream/token/route.ts`
   - Route keeps guard-token touch boilerplate for static audits.
   - Suggested split: standardized guard-touch helper pattern across guarded thin routes.
10. `app/api/admin/b2b/employees/[employeeId]/note/route.ts`, `app/api/admin/b2b/employees/[employeeId]/report/route.ts`, `app/api/admin/b2b/employees/[employeeId]/survey/route.ts`
    - Three sibling routes still carry repetitive runtime/dynamic/error constant scaffolding.
    - Suggested split: shared route shell factory for employee subresource endpoints.

## Recently Completed Splits

1. `lib/chat/context.ts`
   - Refactored into:
     - `lib/chat/context.types.ts`
     - `lib/chat/context.base.ts`
     - `lib/chat/context.profile.ts`
     - `lib/chat/context.assessment.ts`
     - `lib/chat/context.history.ts`
     - `lib/chat/context.prompt.ts`
     - `lib/chat/context.summary.ts`
     - `lib/chat/context.suggestions.ts`
   - `lib/chat/context.ts` now acts as a small facade/re-export layer.
2. `app/(features)/health-link/components/HealthLinkResultSection.tsx`
   - Refactored into shell/content/helpers blocks and separate loading/failure panels.
3. `app/chat/components/recommendedProductActions.utils.ts`
   - Refactored into:
     - `recommendedProductActions.types.ts`
     - `recommendedProductActions.shared.ts`
     - `recommendedProductActions.parse.ts`
     - `recommendedProductActions.resolve.ts`
     - `recommendedProductActions.cart.ts`
   - `recommendedProductActions.utils.ts` now acts as a facade/re-export layer.
4. `lib/b2b/report-payload.ts`
   - Refactored into:
     - `lib/b2b/report-payload-analysis.ts`
     - `lib/b2b/report-payload-types.ts`
   - `report-payload.ts` now focuses on DB fetch orchestration and final payload assembly.
5. `app/api/b2b/employee/sync/route.ts`
   - Route now delegates to `lib/b2b/employee-sync-route-handler.ts`.
   - Shared response/cooldown/log/token helpers live in `lib/b2b/employee-sync-route.ts`.
6. `app/api/health/nhis/init/route.ts`, `app/api/health/nhis/sign/route.ts`, `app/api/health/nhis/fetch/route.ts`, and `app/api/health/nhis/status/route.ts`
   - Shared schema/constants/safe wrappers extracted to:
     - `lib/server/hyphen/init-route-helpers.ts`
     - `lib/server/hyphen/sign-route-helpers.ts`
     - `lib/server/hyphen/fetch-route-helpers.ts`
     - `lib/server/hyphen/status-route-helpers.ts`
   - Additional sign failure handling extracted to:
     - `lib/server/hyphen/sign-route-failure.ts`
   - Init/sign route orchestration is now delegated to:
      - `lib/server/hyphen/init-route.ts`
      - `lib/server/hyphen/sign-route.ts`
7. `app/api/b2b/employee/session/route.ts`
   - GET/POST/DELETE orchestration delegated to:
      - `lib/b2b/employee-session-route-handler.ts`
   - Shared response/token/session primitives remain in:
      - `lib/b2b/employee-session-route.ts`.
8. `app/api/chat/route.ts`
   - Route slimmed to auth/smoke orchestration.
   - Stream body shaping and stream/error response building moved to:
     - `app/api/chat/route-service.ts`
9. `app/api/chat/title/route.ts`
   - Title request parsing/model fallback/model call logic moved to:
     - `app/api/chat/title/route-service.ts`
10. `app/api/chat/suggest/route.ts`
    - Suggestion orchestration moved to:
      - `app/api/chat/suggest/suggest-route-service.ts`
11. `app/api/messages/stream/token/route.ts`
    - Role dispatch and token issuance moved to:
      - `lib/server/message-stream-token-route.ts`
12. `app/api/me/profile/route.ts`
    - Body parsing and profile/session persistence moved to:
      - `lib/server/me-profile-route.ts`
13. `app/api/admin/column/posts/[id]/route.ts`
   - CRUD data operations moved to:
      - `app/api/admin/column/posts/[id]/route-service.ts`
   - Method-level auth/validation/not-found orchestration moved to:
      - `app/api/admin/column/posts/[id]/route-handler.ts`
14. `app/api/admin/b2b/employees/[employeeId]/analysis/route.ts`
   - Route delegated to:
     - `lib/b2b/analysis-route-handler.ts`
   - Route now only exposes method entrypoints.
15. `app/api/auth/kakao/complete/[token]/route.ts`
   - Transfer-token completion orchestration moved to:
     - `lib/auth/kakao/complete-route.ts`
16. `app/api/predict/route.ts`
   - ONNX/session/input-output validation logic moved to:
     - `lib/assess/predict-route.ts`
17. `app/api/user/all-results/route.ts`
   - Actor scope resolution + payload assembly moved to:
     - `lib/server/all-results-route.ts`
18. `app/api/user/profile/route.ts`
   - DB persistence + payload/cookie helpers moved to:
     - `lib/server/user-profile-route.ts`
19. `app/api/get-sorted-pharmacies/route.ts`
   - Input parsing, geocode cache, distance calculation, and sorting moved to:
     - `lib/server/sorted-pharmacies-route.ts`
   - Route now only parses JSON and returns no-store responses.
20. `app/api/auth/phone/send-otp/route.ts`
   - OTP issue/cooldown logic moved to:
     - `lib/server/phone-otp-route.ts` (`issuePhoneOtp`)
   - Route now focuses on request parsing and response mapping.
21. `app/api/auth/email/verify-otp/route.ts`
   - Email OTP verify/consume + appUser email link flow moved to:
     - `lib/server/email-otp-route.ts` (`verifyAndLinkEmailForUser`)
   - Session email sync moved to:
     - `lib/server/email-otp-route.ts` (`syncEmailToUserSession`)
22. `app/api/health/nhis/status/route.ts`
   - Status data-loading orchestration moved to:
     - `lib/server/hyphen/status-route-data.ts`
   - Route now focuses on auth + payload serialization.
23. `app/api/me/link-phone/route.ts`, `app/api/me/unlink-phone/route.ts`, `app/api/me/phone-status/route.ts`
   - Shared phone-link/session/profile persistence logic moved to:
     - `lib/server/me-phone-route.ts`
   - Routes now focus on auth/validation and response mapping.
24. `app/api/auth/email/send-otp/route.ts`
   - OTP issue result-to-response mapping moved to:
     - `lib/server/email-otp-route.ts` (`resolveSendEmailOtpResult`)
   - Route now focuses on auth/validation and response shaping.
25. `app/api/admin/b2b/reports/[reportId]/export/pptx/route.ts`
   - PPTX export orchestration moved to:
     - `lib/b2b/admin-report-export-pptx-route.ts`
   - Route now focuses on admin/report ownership resolution.
26. `app/api/admin/b2b/reports/export-batch/route.ts`
   - Batch export parse/disabled-check/export orchestration moved to:
     - `lib/b2b/admin-report-export-batch-route.ts`
   - Route now focuses on admin guard + top-level error mapping.
27. `app/api/admin/b2b/reports/[reportId]/validation/route.ts`
   - Validation pipeline execution and DB update orchestration moved to:
     - `lib/b2b/admin-report-validation-route.ts`
   - Route now focuses on admin/report ownership resolution + DB error mapping.
28. `app/api/auth/kakao/callback/route.ts`
   - Kakao callback state/token/redirect orchestration moved to:
     - `lib/auth/kakao/callback-handler.ts`
   - Route now focuses on request context resolution and top-level exception logging.
29. `app/api/health/nhis/init/route.ts`
   - Init request orchestration moved to:
     - `lib/server/hyphen/init-route.ts`
   - Route now focuses on NHIS session guard + delegation.
30. `app/api/health/nhis/sign/route.ts`
   - Sign request orchestration moved to:
     - `lib/server/hyphen/sign-route.ts`
   - Route now focuses on NHIS session guard + delegation.
31. `app/api/user/profile/route.ts`
   - GET/POST request orchestration moved to:
     - `lib/server/user-profile-route.ts` (`runUserProfileGetRoute`, `runUserProfilePostRoute`)
   - Route now acts as thin transport wrapper only.
32. `app/api/b2b/employee/session/route.ts`
   - GET/POST/DELETE request orchestration moved to:
     - `lib/b2b/employee-session-route-handler.ts`
   - Route now keeps only db-error mapping + delegation.
33. `app/api/admin/b2b/employees/[employeeId]/note/route.ts`
   - GET/PUT request orchestration moved to:
     - `lib/b2b/admin-employee-note-route.ts`
   - Route now keeps db-error mapping + delegation only.
34. `app/api/admin/b2b/employees/[employeeId]/survey/route.ts`
   - GET/PUT request orchestration moved to:
     - `lib/b2b/admin-employee-survey-route.ts`
   - Route now keeps db-error mapping + delegation only.
35. `app/api/b2b/employee/report/route.ts`
   - Employee report read orchestration moved to:
     - `lib/b2b/employee-report-route.ts`
   - Route now keeps db-error mapping + delegation only.
36. `app/api/admin/b2b/employees/route.ts`
   - Employee list auth/query/serialization moved to:
     - `lib/b2b/admin-employee-list-route.ts`
   - Route now keeps db-error mapping + delegation only.
37. `app/api/admin/b2b/employees/[employeeId]/report/route.ts`
   - GET/POST request orchestration moved to:
     - `lib/b2b/admin-employee-report-route.ts`
   - Route now keeps db-error mapping + delegation only.
38. `app/api/admin/column/posts/[id]/route.ts`
   - Per-method auth/parse/not-found orchestration moved to:
     - `app/api/admin/column/posts/[id]/route-handler.ts`
   - Route now keeps db-error mapping + handler delegation only.
39. `app/api/chat/save/route.ts`
   - GET/POST orchestration moved to:
     - `app/api/chat/save/route-service.ts`
   - Route now only delegates transport entrypoints.
40. `app/api/admin/b2b/reports/[reportId]/meta/route.ts`
   - PATCH orchestration moved to:
     - `lib/b2b/admin-report-meta-route.ts`
   - Route now keeps db-error mapping + delegation only.
41. `app/api/verify-password/route.ts`
   - Admin/test login verification and session/cookie issue flow moved to:
     - `lib/server/verify-password-route.ts`
   - Route now delegates to server-only handler.
42. `app/api/column/upload-image/route.ts`
   - Cloudflare direct-upload token orchestration moved to:
     - `lib/server/column-upload-image-route.ts`
   - Route now delegates to server-only handler.
43. `app/api/push/detach/route.ts`
   - Role-specific ownership/authorization and detach branching moved to:
     - `lib/server/push-detach-route.ts`
   - Route now delegates to server-only handler.
44. `app/api/results/latest/route.ts`
   - Actor scope resolution + latest result payload composition moved to:
     - `lib/server/latest-results-route.ts`
   - Route now delegates to server-only handler.
45. `app/api/internal/warmup/route.ts`
   - Warmup probe orchestration moved to:
     - `lib/server/internal-warmup-route.ts`
   - Route now delegates to server-only handler.
46. `app/api/chat/actions/route.ts`
   - Action execution orchestration moved to:
     - `app/api/chat/actions/route-service.ts`
   - Route now delegates transport-level entrypoints.
47. `app/api/cart-products/route.ts`
   - Cart product lookup orchestration moved to:
     - `lib/server/cart-products-route.ts`
   - Route now delegates to server-only handler.
48. `app/api/me/link-phone/route.ts`, `app/api/me/profile/route.ts`
   - Request parsing and mutation orchestration moved to:
     - `lib/server/me-link-phone-route.ts`
     - `lib/server/me-profile-route.ts`
   - Route-level `requireUserSession` calls are preserved for guard-map/static audits.
49. `app/api/auth/phone/send-otp/route.ts`, `app/api/auth/phone/verify-otp/route.ts`
   - POST orchestration moved to:
     - `lib/server/phone-otp-route.ts` (`runPhoneSendOtpPostRoute`, `runPhoneVerifyOtpPostRoute`)
   - Routes now delegate transport entrypoints only.
50. `app/api/health/nhis/fetch/route.ts`
   - Fetch route orchestration moved to:
     - `lib/server/hyphen/fetch-route.ts`
   - Route now focuses on NHIS session guard + delegation.
51. `app/api/column/editor/save/route.ts`
   - Dev-only markdown file save flow moved to:
     - `lib/server/column-editor-save-route.ts`
   - Route now focuses on admin guard + delegation, with corrected Korean error copy.
52. `app/api/admin/column/posts/[id]/publish/route.ts`
   - Publish/unpublish orchestration moved to:
     - `app/api/admin/column/posts/[id]/publish/route-handler.ts`
     - `app/api/admin/column/posts/[id]/route-service.ts` (`publishAdminColumnPostById`)
   - Route now keeps only DB error mapping + handler delegation.
53. `app/api/auth/kakao/callback/route.ts`
   - Callback request context resolution + fallback moved to:
     - `app/api/auth/kakao/callback/route-service.ts`
   - Route now delegates GET entrypoint only.
54. `app/api/categories/route.ts`
   - Category query timeout/orchestration moved to:
     - `lib/server/categories-route.ts`
   - Route now delegates GET entrypoint only.
55. `app/api/chat/delete/route.ts`
   - Chat delete parse/ownership/delete orchestration moved to:
     - `app/api/chat/delete/route-service.ts`
   - Route now delegates POST entrypoint only.
56. `app/api/auth/logout/route.ts`
   - Session-clear and cookie-expire orchestration moved to:
     - `lib/server/logout-route.ts`
   - Route now delegates GET/POST entrypoints only.
57. `app/api/rag/ingest/route.ts`
   - RAG ingest parse/path-guard/ingest orchestration moved to:
     - `lib/server/rag-ingest-route.ts`
   - Route keeps admin guard and delegates main flow.
58. `app/api/admin/column/posts/route.ts`
   - GET/POST orchestration moved to:
     - `app/api/admin/column/posts/route-handler.ts`
   - Shared helper/message constants cleaned in:
     - `lib/column/admin-route-helpers.ts`
     - `app/api/admin/column/posts/route-service.ts`
59. `app/api/admin/b2b/employees/[employeeId]/route.ts`
   - Employee detail read orchestration moved to:
     - `lib/b2b/admin-employee-detail-route.ts` (`runAdminEmployeeDetailGetRoute`)
   - Route now keeps only DB error mapping + delegation.
60. `app/api/user/latest-results/route.ts`
   - Actor scope resolution + cookie apply + payload shaping moved to:
     - `lib/server/user-latest-results-route.ts`
   - Route now delegates GET entrypoint only.
61. `app/api/push/send/route.ts`
   - Payload parse/log/send orchestration moved to:
     - `app/api/push/send/route-service.ts`
   - Route keeps `requireCustomerOrderAccess` guard call for static guard checks.
62. `app/api/admin/b2b/reports/[reportId]/export/pdf/route.ts`
   - Report ownership resolution + export delegation moved to:
     - `lib/b2b/admin-report-export-pdf-route.ts` (`runAdminReportPdfGetRoute`)
   - Route now delegates GET entrypoint only.
63. `app/api/auth/kakao/complete/[token]/route.ts`
   - Origin/redirect/cookie-attach orchestration moved to:
     - `app/api/auth/kakao/complete/[token]/route-service.ts`
   - Route now delegates GET entrypoint only.
64. `app/api/b2b/employee/sync/route.ts`
   - Authenticated POST parse/error handling moved to:
     - `lib/b2b/employee-sync-route-handler.ts` (`runEmployeeSyncAuthedPostRoute`)
   - Route keeps `requireNhisSession` guard call and delegates flow.
65. `app/api/push/subscribe/route.ts`, `app/api/pharm-push/subscribe/route.ts`, `app/api/rider-push/subscribe/route.ts`
   - Shared parse/save/error responses moved to:
     - `lib/server/push-subscribe-route.ts`
   - Each route keeps role-specific guard call for static guard checks.
66. `app/api/get-payment-info/route.ts`
   - Payment request parse + gateway call orchestration moved to:
     - `lib/server/payment-info-route.ts`
   - Route now delegates POST entrypoint only with corrected Korean error copy.
67. `app/api/product/names/route.ts`
   - Product name/category query and serialization moved to:
     - `lib/server/product-names-route.ts`
   - Route now delegates GET entrypoint only.
68. `app/api/admin/b2b/demo/seed/route.ts`
   - Demo seed/logging/error orchestration moved to:
     - `lib/b2b/admin-demo-seed-route.ts`
   - Route now keeps admin guard + delegation only.
69. `app/api/chat/route.ts`
   - Actor/smoke/stream orchestration moved to:
     - `app/api/chat/route-service.ts` (`runChatPostRoute`)
   - Route now delegates POST entrypoint only.
70. `app/api/me/nickname/check/route.ts`
   - Nickname parse/availability checks moved to:
     - `lib/server/me-nickname-check-route.ts`
   - Route keeps `requireUserSession` guard call and delegates logic.
71. `app/api/admin/b2b/reports/[reportId]/validation/route.ts`
   - Report ownership resolution + validation orchestration moved to:
     - `lib/b2b/admin-report-validation-route.ts` (`runAdminReportValidationGetRoute`)
   - Route now delegates GET entrypoint only.
72. `app/api/b2b/employee/session/route.ts`
   - GET/POST error-wrapped entrypoints moved to:
     - `lib/b2b/employee-session-route-handler.ts` (`runEmployeeSessionGetRoute`, `runEmployeeSessionPostRoute`)
   - Route now delegates GET/POST/DELETE entrypoints only.
73. `lib/server/email-otp-route.ts`
   - Monolithic email OTP route logic split into:
     - `lib/server/email-otp/constants.ts`
     - `lib/server/email-otp/parsing.ts`
     - `lib/server/email-otp/service.ts`
     - `lib/server/email-otp/route.ts`
   - Legacy import path now acts as a facade/re-export layer.
74. `app/api/me/phone-status/route.ts`
   - Phone status auth/response orchestration moved to:
     - `lib/server/me-phone-status-route.ts`
   - Route keeps `requireUserSession` guard token for static guard checks and delegates logic.
75. `app/api/messages/stream/token/route.ts`
   - Parse/issue/error orchestration moved to:
     - `lib/server/message-stream-token-route.ts` (`runMessageStreamTokenPostRoute`)
   - Route now delegates POST entrypoint only while preserving static guard tokens.
76. `app/api/rag/debug/route.ts`
   - Query parse/reindex/retrieval orchestration moved to:
     - `lib/server/rag-debug-route.ts`
   - Route now keeps admin guard and delegates GET entrypoint only.
77. `app/api/rag/reindex/route.ts`
   - Reindex execution/logging/response shaping moved to:
     - `lib/server/rag-reindex-route.ts`
   - Route now keeps admin guard and delegates POST entrypoint only.
78. `app/api/admin/b2b/employees/[employeeId]/note/route.ts`, `app/api/admin/b2b/employees/[employeeId]/report/route.ts`, `app/api/admin/b2b/employees/[employeeId]/survey/route.ts`, `app/api/admin/b2b/employees/[employeeId]/route.ts`
   - Repeated try/catch DB-error shells moved to shared helper:
     - `lib/b2b/route-helpers.ts` (`runWithDbRouteError`)
   - Routes now only pass fallback messages + delegates.
79. `app/api/c-section-score/route.ts`, `app/api/search-address/route.ts`, `app/api/home-data/route.ts`, `app/api/logout/route.ts`
   - Route orchestration moved to server modules:
     - `lib/assess/c-section-score-route.ts` (`runCSectionScorePostRoute`)
     - `lib/server/search-address-route.ts`
     - `lib/server/home-data-route.ts`
     - `lib/server/logout-user-route.ts`
   - Routes now act as thin transport entrypoints.
80. `app/api/admin/column/posts/[id]/route.ts`, `app/api/admin/column/posts/route.ts`
   - Route-layer DB-error/auth wrappers moved further into handlers:
     - `app/api/admin/column/posts/[id]/route-handler.ts`
     - `app/api/admin/column/posts/route-handler.ts`
   - Route files now focus on runtime flags and method entrypoints.
81. `app/api/admin/b2b/reports/export-batch/route.ts`
   - POST orchestration moved to:
     - `lib/b2b/admin-report-export-batch-route.ts` (`runAdminBatchReportExportPostRoute`)
   - Route now keeps admin guard + delegation only.
82. `app/api/agent-playground/run/route.ts`, `app/api/admin/model/route.ts`, `app/api/me/unlink-phone/route.ts`
   - Main execution logic moved to:
     - `lib/server/agent-playground-route.ts`
     - `lib/server/admin-model-route.ts`
     - `lib/server/me-unlink-phone-route.ts`
   - Routes keep required guard checks and delegate execution.
83. `app/api/push/status/route.ts`, `app/api/push/unsubscribe/route.ts`, `app/api/pharm-push/status/route.ts`, `app/api/pharm-push/unsubscribe/route.ts`, `app/api/rider-push/status/route.ts`, `app/api/rider-push/unsubscribe/route.ts`
   - Common parse/auth/status/unsubscribe logic moved to:
     - `lib/server/push-subscribe-route.ts`
   - Six route files now delegate to shared role-aware handlers.
84. `app/api/admin/b2b/employees/[employeeId]/note/route.ts`, `app/api/admin/b2b/employees/[employeeId]/report/route.ts`, `app/api/admin/b2b/employees/[employeeId]/survey/route.ts`
   - DB error wrapper composition standardized with:
     - `lib/b2b/route-helpers.ts` (`withDbRouteError`)
     - `lib/b2b/admin-employee-route-errors.ts`
   - Route files now use constant-based handler composition.
85. `app/api/predict/route.ts`, `app/api/orders-by-phone/route.ts`
   - POST orchestration moved to:
     - `lib/assess/predict-route.ts` (`runPredictPostRoute`)
     - `lib/server/orders-by-phone-route.ts`
   - Routes now delegate execution only.
86. `app/api/chat/title/route.ts`
   - POST orchestration moved to:
     - `app/api/chat/title/route-service.ts` (`runChatTitlePostRoute`)
   - Route now delegates and keeps runtime declaration only.
87. `app/api/admin/b2b/reports/[reportId]/export/pptx/route.ts`
   - Report resolution + export delegation moved to:
     - `lib/b2b/admin-report-export-pptx-route.ts` (`runAdminReportPptxGetRoute`)
   - Route now acts as thin GET adapter only.
88. `app/api/chat/suggest/route.ts`
   - POST orchestration moved to:
     - `app/api/chat/suggest/suggest-route-service.ts` (`runSuggestPostRoute`)
   - Route now delegates POST entrypoint only.
89. `app/api/user/all-results/route.ts`
   - Actor/scope/load/response orchestration moved to:
     - `lib/server/all-results-route.ts` (`runAllResultsGetRoute`)
   - Route now delegates GET entrypoint only.
90. `app/api/b2b/employee/report/export/pdf/route.ts`
   - Auth/period/report resolution moved to:
     - `lib/b2b/employee-report-export-pdf-route.ts` (`runEmployeeReportPdfGetRoute`)
   - Route now delegates GET entrypoint only.
91. `app/api/push/subscribe/route.ts`, `app/api/pharm-push/subscribe/route.ts`, `app/api/rider-push/subscribe/route.ts`
   - Subscribe parse/auth/execute/error flow moved to:
     - `lib/server/push-subscribe-route.ts` (`runCustomerPushSubscribePostRoute`, `runPharmPushSubscribePostRoute`, `runRiderPushSubscribePostRoute`)
   - Route files keep explicit guard tokens for static guard checks and delegate execution.
92. `app/api/admin/b2b/employees/route.ts`, `app/api/b2b/employee/report/route.ts`, `app/api/admin/b2b/reports/[reportId]/meta/route.ts`
   - Route-level `try/catch` DB error shells replaced with:
     - `lib/b2b/route-helpers.ts` (`withDbRouteError`)
   - Routes now keep fallback messages + delegation only.
93. `app/api/b2b/employee/session/route.ts`
   - GET/POST/DELETE entrypoints simplified to direct aliases:
     - `lib/b2b/employee-session-route-handler.ts`
   - Route no longer carries method wrapper boilerplate.
94. `app/api/admin/model/route.ts`, `lib/server/admin-model-route.ts`
   - Admin guard orchestration moved into server module:
     - `runAdminModelAuthedGetRoute`, `runAdminModelAuthedPostRoute`
   - Route now keeps static guard token touch + entrypoint aliases only.
95. `app/api/messages/stream/token/route.ts`, `app/api/me/phone-status/route.ts`
   - Static guard token handling simplified to minimal no-op touch pattern.
   - Route handlers now use direct entrypoint aliases (`export const POST/GET = ...`).
96. `app/api/admin/b2b/employees/[employeeId]/route.ts`, `lib/b2b/admin-employee-detail-route.ts`
   - Request-to-context bridge moved into server module:
     - `runAdminEmployeeDetailGetRouteWithRequest`
   - Route now uses shared DB error wrapper with direct module delegation.
97. `app/api/health/nhis/init/route.ts`, `app/api/health/nhis/fetch/route.ts`, `app/api/health/nhis/sign/route.ts`, `app/api/health/nhis/status/route.ts`, `app/api/health/nhis/unlink/route.ts`
   - NHIS route-level `requireNhisSession` boilerplate moved into server modules:
     - `lib/server/hyphen/init-route.ts` (`runNhisInitPostRoute`)
     - `lib/server/hyphen/fetch-route.ts` (`runNhisFetchPostRoute`)
     - `lib/server/hyphen/sign-route.ts` (`runNhisSignPostRoute`)
     - `lib/server/hyphen/status-route.ts` (`runNhisStatusGetAuthedRoute`)
     - `lib/server/hyphen/unlink-route.ts` (`runNhisUnlinkPostRoute`)
   - Routes now keep runtime/dynamic declarations + thin entrypoint aliases only.
98. `app/api/push/subscribe/route.ts`, `app/api/pharm-push/subscribe/route.ts`, `app/api/rider-push/subscribe/route.ts`, `app/api/push/send/route.ts`
   - Guard-token touch pattern standardized to minimal `if (false) { ... }` form.
   - POST handlers switched to direct aliases (`export const POST = ...`) to remove route wrapper boilerplate.
99. `lib/server/hyphen/init-route.ts`, `lib/server/hyphen/fetch-route.ts`, `lib/server/hyphen/sign-route.ts`
   - User-facing fallback validation messages normalized to Korean copy.
   - Locale safety improved for NHIS failure responses without changing route behavior.
100. `app/api/admin/column/posts/route.ts`, `app/api/user/profile/route.ts`, `app/api/logout/route.ts`
   - GET/POST wrappers replaced with direct alias exports.
   - Route files now focus on runtime/dynamic declarations and transport entrypoints.
101. `app/api/b2b/employee/sync/route.ts`, `lib/b2b/employee-sync-route-handler.ts`
   - NHIS auth check moved into handler (`runEmployeeSyncPostRoute`) to keep route transport-thin.
   - Route keeps explicit `requireNhisSession` guard token touch for static guard-map audits.
102. `lib/wellness/data-loader.ts`, `lib/wellness/data-schemas.ts`
   - Zod schema/type blocks extracted from loader into `data-schemas.ts`.
   - `data-loader.ts` now focuses on template assembly and cache orchestration.
103. `lib/b2b/export/validation.ts`, `lib/b2b/export/validation-geometry.ts`
   - Geometry/intersection/text-estimation helpers extracted into `validation-geometry.ts`.
   - `validation.ts` now focuses on static/runtime validation orchestration.
104. `lib/rnd/module06-closed-loop-ai/contracts-validators.ts`, `lib/rnd/module06-closed-loop-ai/contracts-validators-primitives.ts`
   - Primitive guards and enum/type membership checks extracted into `contracts-validators-primitives.ts`.
   - Main validator now focuses on domain payload validators and assert wrappers.
105. `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.ts`, `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.types.ts`, `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.validation.ts`
   - Module 07 MVP runtime types were fully extracted into `mvp-engine.types.ts`.
   - Input sort/validation pipeline was extracted into `mvp-engine.validation.ts`.
   - `mvp-engine.ts` now focuses on runtime logging, normalization loop orchestration, and output assembly.
106. `app/column/_lib/columns.ts`, `app/column/_lib/columns-content-utils.ts`
   - Column slug/markdown/frontmatter/content utility block extracted into `columns-content-utils.ts`.
   - `columns.ts` now focuses on file/db loading, resolution orchestration, and summary/tag adjacency queries.
   - External API compatibility preserved by re-exporting `normalizeTagSlug` and `buildHeadingAnchorId` from `columns.ts`.
107. `app/column/_lib/columns.ts`, `app/column/_lib/columns-types.ts`, `app/column/_lib/columns-db-source.ts`, `app/column/_lib/columns-file-source.ts`
   - Column domain types moved to `columns-types.ts` to decouple shared contracts from orchestration runtime.
   - DB read paths (published list/detail/alias fallback + missing-table tolerance) moved to `columns-db-source.ts`.
   - Recursive markdown file discovery moved to `columns-file-source.ts`.
   - `columns.ts` now acts as a thinner composition layer that maps raw sources into `ColumnDetail` and resolves slug/tag adjacency.
108. `lib/b2b/export/layout-dsl.ts`, `lib/b2b/export/layout-dsl-flow.ts`
   - Page-flow and line-wrapping primitives extracted into `layout-dsl-flow.ts`:
     `FlowContext`, `wrapLine`, `addNode`, `ensurePageSpace`, `maybeAppendUnit`.
   - `layout-dsl.ts` now focuses more on report section composition and final layout assembly.
   - Extraction intentionally kept behavior-preserving and side-effect-free for safer follow-up refactors.
109. `lib/b2b/demo-seed-builders.ts`, `lib/b2b/demo-seed-selection.ts`
   - Option-selection primitives extracted into `demo-seed-selection.ts`:
     `SurveyOption`, `clamp01`, `targetScoreForPeriod`, `pickOptionByKeyword`,
     `pickOptionByScore`, `pickMultiValues`.
   - `demo-seed-builders.ts` now focuses on schema-aware answer assembly and mock health payload composition.
   - Splitting kept deterministic selection behavior intact while reducing builder-file cognitive load.
110. `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`, `app/(admin)/admin/b2b-reports/_lib/survey-progress.ts`
   - Survey visibility/answer/completion helpers extracted into `survey-progress.ts`:
     `toAnswerRecord`, `isQuestionVisible`, `hasAnswer`, `buildCompletionStats`, `mergeSurveyAnswers`.
   - `B2bAdminReportClient.tsx` now delegates completion-stat computation to the shared helper while keeping view/state orchestration local.
   - Survey `answersJson` + row payload merge normalization also moved to shared helper, reducing repeated selected-value fallback logic.
111. `app/(features)/employee-report/EmployeeReportClient.tsx`, `app/(features)/employee-report/_lib/sync-flow.ts`
   - NHIS 준비/동기화 오케스트레이션을 `sync-flow.ts`로 분리:
     `ensureNhisReadyForSync`, `syncEmployeeReportAndReload`.
   - `EmployeeReportClient.tsx`는 동일한 동작을 유지하면서 래퍼를 통해 동기화 플로우를 위임하도록 단순화.
   - 결과적으로 컴포넌트 파일 길이가 `787 -> 754`로 감소하여 후속 세션에서 흐름 파악이 쉬워짐.
112. `app/(features)/employee-report/EmployeeReportClient.tsx`, `app/(features)/employee-report/_lib/sync-flow.ts`
   - 강제 동기화 재인증 복구 분기와 캐시 소스 판정 로직을 `sync-flow.ts`로 추가 이관:
     `runSyncFlowWithRecovery`, `isCachedSyncSource`, `runRestartAuthFlow`.
   - `handleSignAndSync`와 `handleRestartAuth`의 동기화 분기(준비/복구/캐시판정) 중복을 줄이고 UI 상태 처리 중심으로 단순화.
   - 결과적으로 컴포넌트 파일 길이가 `754 -> 717`로 추가 감소하여 후속 작업 시 핵심 흐름을 더 빠르게 파악할 수 있음.
113. `lib/b2b/export/layout-dsl.ts`, `lib/b2b/export/layout-dsl-config.ts`, `lib/b2b/export/layout-dsl-artifacts.ts`
   - 스타일 프리셋/컬러 토큰 및 선택 로직을 `layout-dsl-config.ts`로 분리:
     `STYLE_COLORS`, `pickStylePreset`.
   - 생성 레이아웃 파일 저장/정리 로직을 `layout-dsl-artifacts.ts`로 분리:
     `persistGeneratedLayout`, `clearGeneratedLayoutArtifacts`.
   - `layout-dsl.ts`는 레이아웃 조립 오케스트레이션에 더 집중되며 파일 길이가 `562 -> 512`로 감소.

114. `app/(features)/health-link/utils-health-data.ts`, `app/(features)/health-link/utils-medication-digest.ts`
   - Medication digest/count/sort helpers were extracted into `utils-medication-digest.ts`:
     `MedicationDigest`, `summarizeMedicationRows`.
   - `utils-health-data.ts` now focuses on checkup metric normalization and tone resolution logic, while re-exporting medication summary APIs for compatibility.
   - File length was reduced from `515 -> 424`, making future health-link follow-up work easier to navigate.
115. `app/(features)/health-link/utils-health-data.ts`, `app/(features)/health-link/utils-checkup-meta.ts`
   - Latest checkup selection/meta extraction logic was extracted into `utils-checkup-meta.ts`:
     `LatestCheckupMeta`, `selectLatestCheckupRows`, `extractLatestCheckupMeta`.
   - `utils-health-data.ts` keeps metric parsing/filter/tone responsibilities and re-exports the extracted APIs for compatibility.
   - File length was further reduced from `424 -> 339`, improving readability for follow-up sessions.
116. `app/chat/hooks/useChat.ts`, `app/chat/hooks/useChat.assistantTurnHandlers.ts`
   - Assistant turn finalize/title orchestration was extracted into `useChat.assistantTurnHandlers.ts`:
     `createAssistantTurnHandlers`, `finalizeAssistantTurn`, `generateTitle`.
   - `useChat.ts` now keeps state/effect composition and delegates title/persist orchestration to the helper.
   - File length was reduced from `522 -> 481`, making hook-level intent easier to scan during follow-up work.
117. `app/chat/components/RecommendedProductActions.tsx`, `app/chat/components/recommendedProductActions.flow.ts`
   - Cart action address-guard/open-cart orchestration was extracted into `recommendedProductActions.flow.ts`:
     `PendingCartAction`, `runCartActionWithAddressGuard`.
   - `RecommendedProductActions.tsx` now delegates cart action gating and focuses more on UI state/markup wiring.
   - File length was reduced from `424 -> 400`, while preserving existing modal and feedback behavior.
118. `app/chat/components/ChatInput.tsx`, `app/chat/components/chatInput.actions.ts`
   - Unified quick-action/agent-example/suggestion merge logic was extracted into `chatInput.actions.ts`:
     `ChatQuickAction`, `ChatAgentExample`, `UnifiedAction`, `buildUnifiedActions`.
   - `ChatInput.tsx` now focuses on rendering and local input behavior, while action-list composition is delegated to the helper.
   - File length was reduced from `418 -> 368`, improving scan speed for follow-up sessions.
119. `app/chat/hooks/useChat.ts`, `app/chat/hooks/useChat.messageFlowHandlers.ts`
   - Message send/initial-assistant orchestration was extracted into `useChat.messageFlowHandlers.ts`:
     `createMessageFlowHandlers`, `sendMessage`, `startInitialAssistantMessage`.
   - `useChat.ts` now composes handlers and keeps hook-level state/effect wiring focused.
   - File length was reduced from `481 -> 461`, improving readability around interactive command and auto-init flows.
120. `app/chat/hooks/useChat.ts`, `app/chat/hooks/useChat.localEffects.ts`
   - Local side-effect bundle was extracted into `useChat.localEffects.ts`:
     `useChatLocalEffects` (action-memory sync, active-session follow-up reset, persisted session save, footer visibility, local label/category hydration).
   - `useChat.ts` now focuses more on state composition and command wiring by delegating repetitive effect setup.
   - File length was reduced from `461 -> 435`, improving scanability of the hook core.
121. `app/chat/hooks/useChat.ts`, `app/chat/hooks/useChat.state.ts`, `app/chat/hooks/useChat.refs.ts`
   - State and ref declarations were extracted into dedicated hooks:
     `useChatState` and `useChatRefs`.
   - `useChat.ts` now keeps orchestration responsibilities (bootstrap/effects/commands) while delegating storage declarations.
   - File length was reduced from `435 -> 379`, and the file is no longer in the Top 20 frontend hotspots report.
122. `app/(features)/health-link/useNhisHealthLink.ts`, `app/(features)/health-link/useNhisHealthLink.summaryFetchState.ts`
   - Summary fetch/cache/failure orchestration was extracted into `useNhisHealthLink.summaryFetchState.ts`:
     `useNhisSummaryFetchState`, including local-cache restore, blocked-state handling, and guarded summary fetch execution.
   - `useNhisHealthLink.ts` now keeps action handlers and capability wiring while delegating fetch-state internals.
   - File length was reduced from `385 -> 320`.
123. `app/(features)/health-link/useNhisHealthLink.ts`, `app/(features)/health-link/useNhisHealthLink.status.ts`
   - NHIS status loading/patching state machine was extracted into `useNhisHealthLink.status.ts`:
     `useNhisStatusState`, including fallback status shape, sequential load guard, and initial status boot effect.
   - `useNhisHealthLink.ts` now focuses on init/sign/fetch/unlink orchestration over shared status + fetch hooks.
   - File length was reduced from `320 -> 250`, removing this hook from the frontend hotspot top list.
124. `app/chat/components/ProfileModal.tsx`, `app/chat/components/useProfileModalState.ts`
   - Profile modal local state and lifecycle effects were extracted into `useProfileModalState.ts`:
     profile sync, escape-key handling, body scroll lock, draggable modal setup, and typed field setter.
   - `ProfileModal.tsx` now focuses on form rendering and action wiring while delegating lifecycle/state plumbing.
   - Main component file length was reduced from `385 -> 377` (small but clearer responsibility boundary).
125. `app/chat/components/RecommendedProductActions.tsx`, `app/chat/components/recommendedProductActions.flow.ts`
   - Address-save follow-up cart mutation/open-cart logic was extracted into
     `applyPendingCartActionAfterAddressSave`.
   - `RecommendedProductActions.tsx` now delegates pending-cart mutation path to shared flow utility and keeps modal close + feedback orchestration local.
   - This keeps cart side-effects centralized in flow helpers for easier follow-up refactors.
126. `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.tsx`, `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.helpers.ts`
   - Variant/group answer helper functions were extracted into `SurveyQuestionField.helpers.ts`:
     `normalizeVariantKey`, `listVariantKeys`, `resolveVariantOptions`, `withVariantAnswer`, `resolveGroupFieldValues`, `buildGroupAnswer`.
   - `SurveyQuestionField.tsx` now focuses on rendering and event wiring while reusing shared answer-shaping helpers.
   - File length was reduced from `374 -> 283`, improving readability in admin report survey follow-up work.
127. `components/order/cartItemsSection.tsx`, `components/order/cartItemsSection.actions.ts`
   - Repeated cart line-item mutations and persistence side-effects were extracted into `cartItemsSection.actions.ts`:
     `buildDecrementedCartItems`, `buildIncrementedCartItems`, `buildRemovedCartItems`, `updateCartAndPersist`.
   - Cart update side-effects (`writeClientCartItems` + `cartUpdated` event) are now centralized to reduce duplication and follow-up error risk.
128. `components/order/cartItemsSection.tsx`, `components/order/useCartProductsResolver.ts`
   - Cart product resolving/fallback/cleanup effect was extracted into `useCartProductsResolver.ts`.
   - `cartItemsSection.tsx` now keeps rendering and action wiring, while async product resolution is isolated in a dedicated hook.
   - Main file length was reduced from `413 -> 322`, improving readability for order/cart follow-up sessions.
129. `components/order/cart.tsx`
   - Fixed mojibake in user-facing cart copy (`장바구니` title, stock-change alert, pharmacy fetch error log) to keep Korean-first UX and avoid ambiguous runtime text.
   - Consolidated duplicated cart persistence side-effects into `persistCartItems` and reused shared `openPhoneModal` handler.
   - The component now has fewer repeated mutation paths, which lowers follow-up regression risk in cart behavior updates.

## Guardrails For Any Refactor

1. Do not change auth ownership checks in API routes without `lib/server/route-auth.ts`.
2. Keep NHIS low-cost fetch defaults intact (`checkupOverview`, `medication`).
3. Keep AI summary enrichment non-blocking for fetch core flow.
4. Run before merge:
   - `npm run audit:encoding`
   - `npm run lint`
   - `npm run build`
5. Refresh onboarding artifacts for follow-up sessions:
   - `npm run agent:context-refresh`
   - `npm run agent:guard-map`
   - `npm run agent:guard-check`

## Existing NHIS Maintenance Scripts

1. `npm run maintenance:nhis-smoke-policy`
2. `npm run maintenance:nhis-smoke-ai-summary`
3. `npm run maintenance:nhis-report-attempts`
4. `npm run maintenance:nhis-prune-attempts`
5. `npm run maintenance:nhis-prune-cache`
