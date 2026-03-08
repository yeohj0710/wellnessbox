# Column Summary Query Extraction

## Goal
- Keep `app/column/_lib/columns.ts` focused on file/DB loading, slug resolution, and public async wrappers.
- Move pure summary-array query logic into a separate module so follow-up sessions can change tag/related/adjacent behavior without re-reading source-loading code.

## Boundary
- `app/column/_lib/columns.ts`
  - File parsing, DB/file source merging, slug resolution, and async public entrypoints.
- `app/column/_lib/columns-summary-queries.ts`
  - Pure helpers for:
    - tag aggregation
    - tag archive filtering
    - related-column selection
    - previous/next column selection

## Follow-up rule
1. If the change is about DB/file precedence or slug resolution, start in `columns.ts`.
2. If the change is about tag counts, related posts, or adjacent navigation, start in `columns-summary-queries.ts`.
3. Keep the helpers pure and pass column summaries in as arguments instead of reintroducing async source loading there.

## QA
- `npm run qa:column:summary-queries`
