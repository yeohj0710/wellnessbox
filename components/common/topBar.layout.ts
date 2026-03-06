export const TOPBAR_LAYOUT_RULES = {
  desktopMenuMinViewport: 1024,
  leftGroupGapPx: 24,
  widthEpsilonPx: 2,
  layoutSafetyPx: 20,
} as const;

export type TopBarLayoutSnapshot = {
  viewportWidth: number;
  rowClientWidth: number;
  rowScrollWidth: number;
  brandWidth: number;
  rightActionsWidth: number;
  navRequiredWidth: number;
};

export type TopBarLayoutRules = typeof TOPBAR_LAYOUT_RULES;

export function resolveTopBarDrawerMode(
  snapshot: TopBarLayoutSnapshot,
  rules: TopBarLayoutRules = TOPBAR_LAYOUT_RULES
) {
  if (snapshot.viewportWidth < rules.desktopMenuMinViewport) return true;

  const availableWidth =
    snapshot.rowClientWidth -
    snapshot.brandWidth -
    snapshot.rightActionsWidth -
    rules.leftGroupGapPx;

  const exceedsWidth =
    snapshot.navRequiredWidth >
    availableWidth - rules.layoutSafetyPx + rules.widthEpsilonPx;
  if (exceedsWidth) return true;

  const rowOverflowing =
    snapshot.rowScrollWidth > snapshot.rowClientWidth + rules.widthEpsilonPx;
  if (rowOverflowing) return true;

  return false;
}
