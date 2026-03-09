# B2B Export Layout DSL Modules

`lib/b2b/export/layout-dsl.ts` now focuses on page assembly. Report line/copy builders live in a dedicated module so export layout changes are easier to trace.

## File roles

- `lib/b2b/export/layout-dsl.ts`
  - Owns page assembly, section placement, header blocks, and final `LayoutDocument` creation.
- `lib/b2b/export/layout-dsl-section-lines.ts`
  - Owns summary/health/medication/survey/guide/trend line builders.
  - Owns score-gauge text formatting and compact text helpers used by the DSL.
- `lib/b2b/export/layout-dsl-flow.ts`
  - Owns page flow primitives such as `addPage`, `addNode`, `ensurePageSpace`, and wrapping.
- `lib/b2b/export/layout-dsl-config.ts`
  - Owns style preset selection and color token configuration.

## Change guide

- Section order, header blocks, page spacing, page assembly:
  - `lib/b2b/export/layout-dsl.ts`
- Report line copy, gauge text, and section body text shaping:
  - `lib/b2b/export/layout-dsl-section-lines.ts`
- Flow primitives, wrapping, and pagination behavior:
  - `lib/b2b/export/layout-dsl-flow.ts`

## Validation

- `npm run qa:b2b:export-layout-dsl-section-lines`
- `npm run qa:medication:resilience`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
