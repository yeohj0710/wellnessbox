import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type WorkspaceStat = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warn";
};

export type SortOption = {
  label: string;
  value: string;
};

export type ManagerWorkspaceShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: WorkspaceStat[];
  toolbar: ReactNode;
  children: ReactNode;
};

export type ManagerToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  actionLabel: string;
  onAction: () => void;
  auxiliaryAction?: ReactNode;
};

export type ManagerResultsHeaderProps = {
  title: string;
  description: string;
  count: number;
};

export type ManagerCardProps = {
  image?: ReactNode;
  title: string;
  description?: string;
  badges?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
};

export type ManagerMetaRowProps = {
  label: string;
  value: string;
};

export type ManagerBadgeProps = {
  children: ReactNode;
  tone?: "default" | "accent" | "warn";
};

export type ManagerEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type ManagerModalProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
};

export type ManagerSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export type ManagerFieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export type ManagerInputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export type ManagerTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
};

export type ManagerSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
};

export type ManagerActionRowProps = {
  children: ReactNode;
};

export type ManagerButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export type ManagerPrimaryButtonProps = ManagerButtonProps & {
  type?: "button" | "submit";
};

export type ManagerSecondaryButtonProps = ManagerButtonProps & {
  asLinkHref?: string;
};

export type AdminToolPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
};
