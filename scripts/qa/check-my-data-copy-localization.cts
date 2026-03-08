const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");

const repoRoot = process.cwd();
const sectionsPath = path.join(repoRoot, "app", "my-data", "myDataPageSections.tsx");
const overviewPath = path.join(
  repoRoot,
  "app",
  "my-data",
  "myDataPageOverviewSections.tsx"
);
const chatPath = path.join(
  repoRoot,
  "app",
  "my-data",
  "myDataPageChatSection.tsx"
);
const labelsPath = path.join(repoRoot, "app", "my-data", "myDataPageLabels.ts");

function readUtf8(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file missing: ${path.relative(repoRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source: string, needle: string, checkName: string) {
  if (!source.includes(needle)) {
    throw new Error(`${checkName}: missing \`${needle}\``);
  }
}

function assertExcludes(source: string, needle: string, checkName: string) {
  if (source.includes(needle)) {
    throw new Error(`${checkName}: found forbidden legacy fragment \`${needle}\``);
  }
}

function main() {
  const sectionsSource = readUtf8(sectionsPath);
  const overviewSource = readUtf8(overviewPath);
  const chatSource = readUtf8(chatPath);
  const labelsSource = readUtf8(labelsPath);

  assertIncludes(
    sectionsSource,
    'from "./myDataPageOverviewSections"',
    "sections_reexport_overview_module"
  );
  assertIncludes(
    sectionsSource,
    'from "./myDataPageChatSection"',
    "sections_reexport_chat_module"
  );
  assertIncludes(
    overviewSource,
    'from "./myDataPageLabels"',
    "overview_import_labels_helper"
  );
  assertIncludes(
    overviewSource,
    "formatActorSourceBadge",
    "overview_use_actor_source_label"
  );
  assertIncludes(
    overviewSource,
    "formatPhoneLinkedBadge",
    "overview_use_phone_link_label"
  );
  assertIncludes(
    overviewSource,
    "formatProfileDataBadge",
    "overview_use_profile_data_label"
  );
  assertIncludes(
    overviewSource,
    "formatTechnicalIdBadge",
    "overview_use_technical_id_label"
  );
  assertIncludes(
    chatSource,
    "formatChatScopeLabel",
    "chat_use_chat_scope_label"
  );
  assertIncludes(
    chatSource,
    "formatChatStatusLabel",
    "chat_use_chat_status_label"
  );
  assertIncludes(
    chatSource,
    "formatChatRoleLabel",
    "chat_use_chat_role_label"
  );

  assertExcludes(overviewSource, '"Kakao"', "overview_no_english_source_badge");
  assertExcludes(overviewSource, '"Session"', "overview_no_english_session_badge");
  assertExcludes(
    overviewSource,
    'phoneLinked: {phoneLinked ? "yes" : "no"}',
    "overview_no_raw_phone_link_flag"
  );
  assertExcludes(overviewSource, '"has data"', "overview_no_english_profile_badge");
  assertExcludes(chatSource, '{scope}</Pill>', "chat_no_raw_scope_label");
  assertExcludes(chatSource, "{message.role}", "chat_no_raw_role_label");

  assertIncludes(
    labelsSource,
    'return isKakaoLoggedIn ? "카카오 계정" : "세션 기준";',
    "labels_define_actor_source_copy"
  );
  assertIncludes(
    labelsSource,
    'if (normalized === "active") return "진행 중";',
    "labels_define_chat_status_copy"
  );
  assertIncludes(
    labelsSource,
    'if (normalized === "assistant") return "AI";',
    "labels_define_chat_role_copy"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "sections_reexport_overview_module",
          "sections_reexport_chat_module",
          "overview_import_labels_helper",
          "overview_use_actor_source_label",
          "overview_use_phone_link_label",
          "overview_use_profile_data_label",
          "overview_use_technical_id_label",
          "chat_use_chat_scope_label",
          "chat_use_chat_status_label",
          "chat_use_chat_role_label",
          "overview_no_english_source_badge",
          "overview_no_english_session_badge",
          "overview_no_raw_phone_link_flag",
          "overview_no_english_profile_badge",
          "chat_no_raw_scope_label",
          "chat_no_raw_role_label",
          "labels_define_actor_source_copy",
          "labels_define_chat_status_copy",
          "labels_define_chat_role_copy",
        ],
      },
      null,
      2
    )
  );
}

main();
