/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const shellSource = read("app/chat/components/ChatDrawer.tsx");
  const headerSource = read("app/chat/components/ChatDrawerHeader.tsx");
  const itemSource = read("app/chat/components/ChatDrawerSessionItem.tsx");
  const dialogSource = read("app/chat/components/ChatDrawerDeleteDialog.tsx");

  const requiredShellTokens = ["아직 저장된 대화 기록이 없습니다."];
  const requiredHeaderTokens = ["채팅", "닫기", "새 상담"];
  const requiredItemTokens = [
    'aria-label="메뉴"',
    'aria-label="삭제"',
    "대화 제목 수정",
    '{session.appUserId ? "계정" : "기기"}',
  ];
  const requiredDialogTokens = [
    "대화를 삭제할까요?",
    "대화를 삭제하면 복구할 수 없습니다.",
    "삭제 중",
  ];

  for (const token of requiredShellTokens) {
    assert.ok(
      shellSource.includes(token),
      `ChatDrawer.tsx should include cleaned copy token: ${token}`
    );
  }

  for (const token of requiredHeaderTokens) {
    assert.ok(
      headerSource.includes(token),
      `ChatDrawerHeader.tsx should include cleaned copy token: ${token}`
    );
  }

  for (const token of requiredItemTokens) {
    assert.ok(
      itemSource.includes(token),
      `ChatDrawerSessionItem.tsx should include cleaned copy token: ${token}`
    );
  }

  for (const token of requiredDialogTokens) {
    assert.ok(
      dialogSource.includes(token),
      `ChatDrawerDeleteDialog.tsx should include cleaned copy token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: ["chat_drawer_copy_is_clean_and_korean_first"],
      },
      null,
      2
    )
  );
}

try {
  run();
} catch (error) {
  console.error("[qa:chat:drawer-copy] FAIL", error);
  process.exit(1);
}
