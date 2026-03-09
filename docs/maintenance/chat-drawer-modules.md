# Chat Drawer Modules

`app/chat/components/ChatDrawer.tsx`를 상태 셸과 UI 서브블록으로 분리한 메모입니다.

## 목적

- 채팅 드로어의 헤더, 세션 아이템, 삭제 확인 모달을 각각 분리합니다.
- 메인 파일은 드로어 상태, rename/delete 핸들러, 셸 배치에 집중하게 합니다.
- 다음 세션에서 "헤더 UI 수정", "세션 항목 수정", "삭제 확인 모달 수정"을 다른 파일에서 바로 찾게 합니다.

## 현재 경계

- `app/chat/components/ChatDrawer.tsx`
  - state shell
  - menu/edit/delete 상태
  - subcomponent 조립
- `app/chat/components/ChatDrawerHeader.tsx`
  - 드로어 상단 제목
  - 닫기 버튼
  - 새 상담 버튼
- `app/chat/components/ChatDrawerSessionItem.tsx`
  - 세션 row
  - inline title edit
  - item menu / delete trigger
- `app/chat/components/ChatDrawerDeleteDialog.tsx`
  - draggable delete confirm dialog
  - confirm/cancel button UI
- `app/chat/components/ChatDrawer.types.ts`
  - drawer subcomponent prop contract

## 수정 가이드

- 드로어 상태 흐름, rename/delete wiring 변경
  - `app/chat/components/ChatDrawer.tsx`
- 상단 버튼/레이아웃 변경
  - `app/chat/components/ChatDrawerHeader.tsx`
- 세션 row 배치나 편집 UI 변경
  - `app/chat/components/ChatDrawerSessionItem.tsx`
- 삭제 확인 모달 레이아웃/카피 변경
  - `app/chat/components/ChatDrawerDeleteDialog.tsx`
- subcomponent prop shape 변경
  - `app/chat/components/ChatDrawer.types.ts`

## 검증

- `npm run qa:chat:drawer-modules`
- `npm run qa:chat:drawer-copy`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
