# Scope/ClientId Smoke Tests

## Start dev server
```
npm run dev
```

## Run smoke tests
```
BASE_URL=http://localhost:3000 npx ts-node scripts/smoke-scope.ts
```

## Backfill results
Dry run first:
```
npx ts-node scripts/backfill-app-user-results.ts --dry-run
```

Execute:
```
npx ts-node scripts/backfill-app-user-results.ts
```
