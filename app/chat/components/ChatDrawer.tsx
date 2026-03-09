"use client";

import { useState } from "react";
import type { ChatSession } from "@/types/chat";
import ChatDrawerDeleteDialog from "./ChatDrawerDeleteDialog";
import ChatDrawerHeader from "./ChatDrawerHeader";
import ChatDrawerSessionItem from "./ChatDrawerSessionItem";
import type { ChatDrawerProps } from "./ChatDrawer.types";

export default function ChatDrawer({
  sessions,
  activeId,
  setActiveId,
  deleteChat,
  renameChat,
  newChat,
  drawerVisible,
  drawerOpen,
  closeDrawer,
  highlightId,
}: ChatDrawerProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState("");
  const [deleting, setDeleting] = useState(false);

  function commitRename() {
    if (editingId && editingTitle.trim()) {
      renameChat(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  }

  function cancelRename() {
    setEditingId(null);
    setEditingTitle("");
  }

  function startDelete(session: ChatSession) {
    setMenuOpenId(null);
    setConfirmDeleteId(session.id);
    setConfirmDeleteTitle(session.title || "새 상담");
  }

  function cancelDelete() {
    if (deleting) return;
    setConfirmDeleteId(null);
    setConfirmDeleteTitle("");
  }

  async function confirmDelete() {
    if (!confirmDeleteId || deleting) return;
    setDeleting(true);
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setConfirmDeleteTitle("");
    try {
      await deleteChat(id);
    } finally {
      setDeleting(false);
    }
  }

  if (!drawerVisible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-20"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (confirmDeleteId) return;
        setMenuOpenId(null);
        closeDrawer();
      }}
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        className={`absolute inset-y-0 left-0 w-[280px] max-w-[72vw] transform border-r border-slate-200 bg-white transition-transform duration-200 sm:w-[300px] ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <ChatDrawerHeader
          closeDrawer={closeDrawer}
          newChat={newChat}
          resetMenu={() => setMenuOpenId(null)}
        />

        <div className="flex h-[calc(100%-6rem)] flex-col">
          {sessions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              아직 저장된 대화 기록이 없습니다.
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto p-2">
              {sessions.map((session) => (
                <ChatDrawerSessionItem
                  key={session.id}
                  session={session}
                  active={activeId === session.id}
                  highlightId={highlightId}
                  menuOpen={menuOpenId === session.id}
                  editing={editingId === session.id}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                  onSelect={() => {
                    setMenuOpenId(null);
                    setActiveId(session.id);
                    closeDrawer();
                  }}
                  onToggleMenu={() =>
                    setMenuOpenId(menuOpenId === session.id ? null : session.id)
                  }
                  onStartEdit={() => {
                    setEditingId(session.id);
                    setEditingTitle(session.title || "");
                    setMenuOpenId(null);
                  }}
                  onStartDelete={() => startDelete(session)}
                  onCommitRename={commitRename}
                  onCancelRename={cancelRename}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      <ChatDrawerDeleteDialog
        open={Boolean(confirmDeleteId)}
        title={confirmDeleteTitle}
        deleting={deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
