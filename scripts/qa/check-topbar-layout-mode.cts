import assert from "node:assert/strict";
import {
  resolveTopBarDrawerMode,
  TOPBAR_LAYOUT_RULES,
} from "../../components/common/topBar.layout";

function run() {
  const checks: string[] = [];

  assert.equal(
    resolveTopBarDrawerMode({
      viewportWidth: TOPBAR_LAYOUT_RULES.desktopMenuMinViewport - 1,
      rowClientWidth: 1200,
      rowScrollWidth: 1200,
      brandWidth: 180,
      rightActionsWidth: 360,
      navRequiredWidth: 500,
    }),
    true
  );
  checks.push("mobile_width_forces_drawer");

  assert.equal(
    resolveTopBarDrawerMode({
      viewportWidth: TOPBAR_LAYOUT_RULES.desktopMenuMinViewport,
      rowClientWidth: 1200,
      rowScrollWidth: 1200,
      brandWidth: 180,
      rightActionsWidth: 340,
      navRequiredWidth: 620,
    }),
    false
  );
  checks.push("enough_space_keeps_desktop");

  assert.equal(
    resolveTopBarDrawerMode({
      viewportWidth: 1600,
      rowClientWidth: 1200,
      rowScrollWidth: 1200,
      brandWidth: 180,
      rightActionsWidth: 340,
      navRequiredWidth: 660,
    }),
    true
  );
  checks.push("layout_safety_margin_promotes_drawer");

  assert.equal(
    resolveTopBarDrawerMode({
      viewportWidth: 1600,
      rowClientWidth: 1200,
      rowScrollWidth: 1205,
      brandWidth: 180,
      rightActionsWidth: 340,
      navRequiredWidth: 620,
    }),
    true
  );
  checks.push("row_overflow_promotes_drawer");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks,
      },
      null,
      2
    )
  );
}

run();
