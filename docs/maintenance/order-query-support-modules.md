# Order Query Support Modules

## Goal
- Keep `lib/order/queries.ts` focused on exported order query entry points.
- Move reusable selection, pagination, phone-candidate normalization, and operator list paging into a shared support module.

## Scope
- Entry queries:
  - `lib/order/queries.ts`
- Shared support:
  - `lib/order/query-support.ts`
- QA guard:
  - `scripts/qa/check-order-query-support-modules.cts`
  - npm script: `qa:order:query-support-modules`

## Responsibility
- `queries.ts`
  - own public query functions used by order detail, pharmacy, rider, and order-complete flows
  - keep route-facing error behavior and business filtering rules
- `query-support.ts`
  - own shared Prisma selections for summary/operator order rows
  - own pagination defaults and normalization
  - own phone normalization/candidate expansion
  - own shared paginated summary/operator paging helpers

## Edit Guide
- Change shared order list select shape in `query-support.ts`.
- Change page/take normalization or phone matching rules in `query-support.ts`.
- Change pharmacy/rider business filters or user-facing thrown errors in `queries.ts`.

## Validation
1. `npm run qa:order:query-support-modules`
2. `npm run audit:encoding`
3. `npm run lint`
4. `npm run build`
