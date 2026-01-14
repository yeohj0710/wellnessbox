# Scope/ClientId Smoke Tests

## Start dev server
```
npm run dev
```

## Run smoke tests
```
BASE_URL=http://localhost:3000 node scripts/smoke-scope.ts
```

## Backfill results
Dry run first:
```
node scripts/backfill-app-user-results.ts --dry-run
```

Execute:
```
node scripts/backfill-app-user-results.ts
```
