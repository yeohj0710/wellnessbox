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
  const typesSource = read("app/chat/components/ChatDrawer.types.ts");
  const docSource = read("docs/maintenance/chat-drawer-modules.md");

  const shellTokens = [
    'from "./ChatDrawerDeleteDialog"',
    'from "./ChatDrawerHeader"',
    'from "./ChatDrawerSessionItem"',
    'from "./ChatDrawer.types"',
    "<ChatDrawerHeader",
    "<ChatDrawerSessionItem",
    "<ChatDrawerDeleteDialog",
  ];
  for (const token of shellTokens) {
    assert.ok(
      shellSource.includes(token),
      `ChatDrawer.tsx should compose extracted modules with token: ${token}`
    );
  }

  const forbiddenShellTokens = [
    "useDraggableModal(",
    "<EllipsisHorizontalIcon",
    "<TrashIcon",
    "대화를 삭제할까요?",
  ];
  for (const token of forbiddenShellTokens) {
    assert.ok(
      !shellSource.includes(token),
      `ChatDrawer.tsx should not inline extracted token: ${token}`
    );
  }

  const headerTokens = ["채팅", "닫기", "새 상담"];
  for (const token of headerTokens) {
    assert.ok(
      headerSource.includes(token),
      `ChatDrawerHeader.tsx should own header token: ${token}`
    );
  }

  const itemTokens = [
    'aria-label="메뉴"',
    'aria-label="삭제"',
    "대화 제목 수정",
    '{session.appUserId ? "계정" : "기기"}',
  ];
  for (const token of itemTokens) {
    assert.ok(
      itemSource.includes(token),
      `ChatDrawerSessionItem.tsx should own item token: ${token}`
    );
  }

  const dialogTokens = [
    "useDraggableModal(",
    "대화를 삭제할까요?",
    "대화를 삭제하면 복구할 수 없습니다.",
    "삭제 중",
  ];
  for (const token of dialogTokens) {
    assert.ok(
      dialogSource.includes(token),
      `ChatDrawerDeleteDialog.tsx should own dialog token: ${token}`
    );
  }

  const typeTokens = [
    "export interface ChatDrawerProps",
    "export interface ChatDrawerHeaderProps",
    "export interface ChatDrawerSessionItemProps",
    "export interface ChatDrawerDeleteDialogProps",
  ];
  for (const token of typeTokens) {
    assert.ok(
      typesSource.includes(token),
      `ChatDrawer.types.ts should own type token: ${token}`
    );
  }

  const docTokens = [
    "`app/chat/components/ChatDrawer.tsx`",
    "`app/chat/components/ChatDrawerHeader.tsx`",
    "`app/chat/components/ChatDrawerSessionItem.tsx`",
    "`app/chat/components/ChatDrawerDeleteDialog.tsx`",
    "`app/chat/components/ChatDrawer.types.ts`",
    "`npm run qa:chat:drawer-modules`",
  ];
  for (const token of docTokens) {
    assert.ok(
      docSource.includes(token),
      `chat-drawer-modules.md should mention token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "chat_drawer_shell_is_thin",
          "chat_drawer_header_item_dialog_are_split",
          "chat_drawer_type_contract_is_shared",
        ],
      },
      null,
      2
    )
  );
}

try {
  run();
} catch (error) {
  console.error("[qa:chat:drawer-modules] FAIL", error);
  process.exit(1);
}
