"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import Link from "next/link";
import {
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type WorkspaceStat = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warn";
};

type SortOption = {
  label: string;
  value: string;
};

export function ManagerWorkspaceShell(props: {
  eyebrow: string;
  title: string;
  description: string;
  stats: WorkspaceStat[];
  toolbar: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_24px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-500 to-blue-600" />
        <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="absolute left-0 top-16 h-32 w-32 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="relative space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-700/75">
              {props.eyebrow}
            </p>
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-900 sm:text-[2rem]">
                {props.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                {props.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {props.stats.map((stat) => (
              <ManagerStatChip key={`${stat.label}:${stat.value}`} {...stat} />
            ))}
          </div>

          {props.toolbar}
        </div>
      </div>

      {props.children}
    </section>
  );
}

function ManagerStatChip({ label, value, tone = "default" }: WorkspaceStat) {
  const toneClass =
    tone === "accent"
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`min-w-[8.5rem] rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black tracking-[-0.02em]">{value}</p>
    </div>
  );
}

export function ManagerToolbar(props: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  actionLabel: string;
  onAction: () => void;
  auxiliaryAction?: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-[24px] border border-slate-200/70 bg-white/85 p-3 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.32)] sm:grid-cols-[minmax(0,1.35fr)_14rem_auto] sm:items-center">
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
        <input
          value={props.searchValue}
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder={props.searchPlaceholder}
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <ArrowsUpDownIcon className="h-5 w-5 text-slate-400" />
        <select
          value={props.sortValue}
          onChange={(event) => props.onSortChange(event.target.value)}
          className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
        >
          {props.sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center justify-end gap-2">
        {props.auxiliaryAction}
        <button
          type="button"
          onClick={props.onAction}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-[0_16px_34px_-18px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <PlusIcon className="h-4 w-4" />
          {props.actionLabel}
        </button>
      </div>
    </div>
  );
}

export function ManagerResultsHeader(props: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[24px] border border-slate-200/80 bg-white/80 px-5 py-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.3)] sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-black tracking-[-0.02em] text-slate-900">{props.title}</h2>
        <p className="text-sm text-slate-500">{props.description}</p>
      </div>
      <div className="text-sm font-semibold text-slate-500">
        총 <span className="font-black text-slate-900">{props.count.toLocaleString()}</span>개
      </div>
    </div>
  );
}

export function ManagerCardGrid(props: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{props.children}</div>;
}

export function ManagerCard(props: {
  image?: ReactNode;
  title: string;
  description?: string;
  badges?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white text-left shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_28px_70px_-34px_rgba(14,116,144,0.3)]"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-sky-400 to-blue-500 opacity-0 transition group-hover:opacity-100" />
      {props.image}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-2">
          {props.badges ? <div className="flex flex-wrap gap-2">{props.badges}</div> : null}
          <div className="space-y-1.5">
            <h3 className="text-base font-black leading-6 tracking-[-0.02em] text-slate-900">
              {props.title}
            </h3>
            {props.description ? (
              <p className="text-sm leading-6 text-slate-600">{props.description}</p>
            ) : null}
          </div>
        </div>
        {props.meta ? <div className="space-y-2 text-sm text-slate-500">{props.meta}</div> : null}
        {props.footer ? <div className="mt-auto">{props.footer}</div> : null}
      </div>
    </button>
  );
}

export function ManagerMetaRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
      <span className="text-[12px] font-semibold tracking-[0.04em] text-slate-500">{props.label}</span>
      <span className="text-sm font-bold text-slate-800">{props.value}</span>
    </div>
  );
}

export function ManagerBadge(props: { children: ReactNode; tone?: "default" | "accent" | "warn" }) {
  const toneClass =
    props.tone === "accent"
      ? "bg-sky-50 text-sky-700 ring-sky-100"
      : props.tone === "warn"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${toneClass}`}>
      {props.children}
    </span>
  );
}

export function ManagerEmptyState(props: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-[0_20px_50px_-40px_rgba(15,23,42,0.3)]">
      <div className="mx-auto max-w-md space-y-3">
        <h3 className="text-xl font-black tracking-[-0.03em] text-slate-900">{props.title}</h3>
        <p className="text-sm leading-6 text-slate-500">{props.description}</p>
        {props.actionLabel && props.onAction ? (
          <button
            type="button"
            onClick={props.onAction}
            className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
          >
            {props.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ManagerModal(props: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!props.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onClick={props.onClose}
    >
      <div
        className="w-[min(96vw,72rem)] max-h-[88vh] overflow-hidden rounded-[30px] border border-white/50 bg-white shadow-[0_40px_120px_-35px_rgba(15,23,42,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.96))] px-6 py-5">
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-900">{props.title}</h2>
            <p className="text-sm leading-6 text-slate-500">{props.description}</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            aria-label="닫기"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(88vh-92px)] overflow-y-auto px-6 py-6">{props.children}</div>
      </div>
    </div>
  );
}

export function ManagerSection(props: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-base font-black tracking-[-0.02em] text-slate-900">{props.title}</h3>
        {props.description ? <p className="text-sm leading-6 text-slate-500">{props.description}</p> : null}
      </div>
      {props.children}
    </section>
  );
}

export function ManagerField(props: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-bold text-slate-800">{props.label}</span>
      {props.hint ? <span className="block text-xs text-slate-500">{props.hint}</span> : null}
      {props.children}
    </label>
  );
}

export function ManagerInput(
  props: InputHTMLAttributes<HTMLInputElement> & { className?: string }
) {
  const className =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";
  return <input {...props} className={`${className} ${props.className || ""}`.trim()} />;
}

export function ManagerTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
) {
  const className =
    "min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";
  return <textarea {...props} className={`${className} ${props.className || ""}`.trim()} />;
}

export function ManagerSelect(
  props: SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
) {
  const className =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100";
  return <select {...props} className={`${className} ${props.className || ""}`.trim()} />;
}

export function ManagerActionRow(props: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 pt-2">{props.children}</div>;
}

export function ManagerPrimaryButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={props.type || "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}

export function ManagerSecondaryButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  asLinkHref?: string;
}) {
  const className =
    "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  if (props.asLinkHref) {
    return (
      <Link href={props.asLinkHref} className={className}>
        {props.children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={className}
    >
      {props.children}
    </button>
  );
}

export function ManagerDangerButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}

export function AdminToolPageShell(props: {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_12%_0%,rgba(125,211,252,0.65),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(191,219,254,0.8),transparent_28%),linear-gradient(180deg,#f7fbff_0%,#edf4fb_100%)]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-sky-700/70">
              {props.eyebrow}
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-[2.4rem]">
                {props.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                {props.description}
              </p>
            </div>
          </div>

          <ManagerSecondaryButton asLinkHref={props.backHref || "/admin"}>
            {props.backLabel || "운영 대시보드로 돌아가기"}
          </ManagerSecondaryButton>
        </div>

        {props.children}
      </div>
    </div>
  );
}
