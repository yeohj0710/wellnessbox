# Admin Employee Management Route Modules

## Goal
- Keep the admin employee management server route readable during follow-up work.
- Separate GET response shaping from DB query and destructive operation flows.
- Make it obvious where to edit serialization versus mutation behavior.

## Modules
- Shared admin employee API contract types and record-type enum:
  - `lib/b2b/admin-employee-management-contract.ts`
- Route orchestration:
  - `lib/b2b/admin-employee-management-route.ts`
- Shared employee selectors, nullable text handling, and create/patch plan building:
  - `lib/b2b/admin-employee-management-route-employee.ts`
- GET-side employee detail loading and recent-record query composition:
  - `lib/b2b/admin-employee-management-route-get.ts`
- GET response serialization and summary shaping:
  - `lib/b2b/admin-employee-management-route-response.ts`
- Destructive employee operations and cache/data cleanup:
  - `lib/b2b/admin-employee-management-route-ops.ts`

## Edit Guide
- When changing the server/client shared payload shape for employee list/detail responses or record type names:
  - Start in `lib/b2b/admin-employee-management-contract.ts`
- When changing auth, input schema, request parsing, route branching, or create/patch response shape:
  - Start in `lib/b2b/admin-employee-management-route.ts`
- When changing reusable employee selectors, `appUserId` normalization, or create/patch identity planning:
  - Start in `lib/b2b/admin-employee-management-route-employee.ts`
- When changing which recent records are loaded for the admin GET detail panel, query ordering, or hyphen-linked lookups:
  - Start in `lib/b2b/admin-employee-management-route-get.ts`
- When changing admin GET payload fields, recent record formatting, JSON shape summaries, or health-link response structure:
  - Start in `lib/b2b/admin-employee-management-route-response.ts`
- When changing reset-all, period reset, hyphen cache cleanup, single-record deletion, or employee delete transaction behavior:
  - Start in `lib/b2b/admin-employee-management-route-ops.ts`

## Guardrails
- Keep admin ownership/auth checks in `lib/server/route-auth.ts`.
- Keep Prisma access on the shared singleton from `lib/db.ts`.
- Preserve Korean-first operator-facing copy and run encoding audit after text edits.

## Validation
1. `npm run audit:encoding`
2. `npm run lint`
3. `npm run build`
