import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-forms.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /useB2bEmployeeDataForms\(/,
    "B2bAdminEmployeeDataClient는 폼 상태 공통 훅을 사용해야 합니다."
  );
  checks.push("client_uses_forms_hook");

  assert.ok(
    !/const \[createName, setCreateName\]/.test(clientSource),
    "B2bAdminEmployeeDataClient에 create 폼 state 인라인 선언이 없어야 합니다."
  );
  checks.push("client_has_no_inline_create_state");

  assert.ok(
    !/const \[editName, setEditName\]/.test(clientSource),
    "B2bAdminEmployeeDataClient에 edit 폼 state 인라인 선언이 없어야 합니다."
  );
  checks.push("client_has_no_inline_edit_state");

  assert.ok(
    !/replace\(\/\\D\/g, \"\"\)/.test(clientSource),
    "숫자 입력 정규화는 폼 훅으로 이동되어야 합니다."
  );
  checks.push("client_has_no_inline_digit_normalization");

  assert.match(
    hookSource,
    /toCreatePayload/,
    "폼 훅은 create payload 빌더를 제공해야 합니다."
  );
  checks.push("hook_exposes_create_payload_builder");

  assert.match(
    hookSource,
    /toEditPayload/,
    "폼 훅은 edit payload 빌더를 제공해야 합니다."
  );
  checks.push("hook_exposes_edit_payload_builder");

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
