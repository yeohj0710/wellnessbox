import type { ChatSession } from "@/types/chat";

export interface ChatDrawerProps {
  sessions: ChatSession[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  deleteChat: (id: string) => void | Promise<void>;
  renameChat: (id: string, title: string) => void;
  newChat: () => void;
  drawerVisible: boolean;
  drawerOpen: boolean;
  closeDrawer: () => void;
  highlightId?: string | null;
}

export interface ChatDrawerHeaderProps {
  closeDrawer: () => void;
  newChat: () => void;
  resetMenu: () => void;
}

export interface ChatDrawerSessionItemProps {
  session: ChatSession;
  active: boolean;
  highlightId?: string | null;
  menuOpen: boolean;
  editing: boolean;
  editingTitle: string;
  setEditingTitle: (value: string) => void;
  onSelect: () => void;
  onToggleMenu: () => void;
  onStartEdit: () => void;
  onStartDelete: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}

export interface ChatDrawerDeleteDialogProps {
  open: boolean;
  title: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}
