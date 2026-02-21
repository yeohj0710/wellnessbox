# Refactor Backlog (Hotspot Driven)

Base input: `npm run audit:hotspots`

## Completed in this cycle

1. `app/api/chat/actions/route.ts`
   - Reduced to thin orchestration route.
   - Extracted action logic into `lib/chat/actions/{shared,fallback,model}.ts`.
2. `app/chat/hooks/useChat.ts`
   - Extracted browser helpers, suggestions, evaluation logic.
   - Added `useChat.api.ts` to centralize chat endpoint calls.
3. `components/chat/DesktopChatDock.tsx`
   - Split dock panel from trigger container.
4. `components/chat/DesktopChatDockPanel.tsx`
   - Extracted session drawer layer into `DesktopChatDockSessionLayer.tsx`.
5. Agent maintenance tooling
   - Added `agent:skills-catalog` and `agent:refactor-report` scripts.

## Priority 1 (next)

1. `app/chat/hooks/useChat.ts` (~1560 lines)
   - Extract initial assistant flow into module.
   - Extract session persistence helpers into module.
2. `app/(components)/homeProductSection.tsx` (~1041 lines)
   - Split data retrieval from rendering sections.
3. `components/chat/DesktopChatDockPanel.tsx` (~990 lines)
   - Split header/feed/resize-hint into dedicated components.

## Priority 2

1. `lib/chat/context.ts` (~916 lines)
   - Move classification and scoring utilities into focused files.
2. `components/order/orderDetails.tsx` (~858 lines)
   - Split summary/payment/status detail blocks.

## Guardrails

- Keep auth checks in `lib/server/route-auth.ts`.
- Keep Prisma singleton only in `lib/db.ts`.
- Keep order stock mutation inside `lib/order/mutations.ts:createOrder`.
- Run `npm run audit:encoding` before and after major edits.
- Final verification baseline: `npm run lint` and `npm run build`.
