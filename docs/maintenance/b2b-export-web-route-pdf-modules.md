# B2B Export Web Route PDF Modules

## Goal
- Keep `lib/b2b/export/web-route-pdf.ts` focused on Playwright launch, page capture orchestration, and retry policy.
- Move reusable PDF capture settings and report-page sizing/render override logic into small helper modules.

## Scope
- Entry orchestration:
  - `lib/b2b/export/web-route-pdf.ts`
- Capture settings:
  - `lib/b2b/export/web-route-pdf.config.ts`
- Page sizing and render overrides:
  - `lib/b2b/export/web-route-pdf-page.ts`
- Shared viewport parsing:
  - `lib/b2b/export/pdf-capture-settings.ts`
- QA guard:
  - `scripts/qa/check-b2b-export-web-route-pdf-modules.cts`
  - npm script: `qa:b2b:export-web-route-pdf-modules`

## Responsibility
- `web-route-pdf.ts`
  - own browser launch, context lifecycle, page wait sequence, and compact retry decision
  - keep PDF export failure handling at the entry layer
- `web-route-pdf.config.ts`
  - own viewport normalization, device scale factor resolution, byte budget, and page margin settings
  - reuse `pdf-capture-settings.ts` for shared viewport width normalization
- `web-route-pdf-page.ts`
  - own report page measurement and export-time DOM/CSS overrides
  - keep page sizing rules away from browser orchestration code

## Edit Guide
- Change env-driven PDF capture thresholds in `web-route-pdf.config.ts`.
- Change report-page measurement or export CSS overrides in `web-route-pdf-page.ts`.
- Change Playwright navigation/wait/retry flow in `web-route-pdf.ts`.

## Validation
1. `npm run qa:b2b:export-web-route-pdf-modules`
2. `npm run audit:encoding`
3. `npm run lint`
4. `npm run build`
