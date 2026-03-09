"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type {
  ManagerActionRowProps,
  ManagerButtonProps,
  ManagerFieldProps,
  ManagerInputProps,
  ManagerModalProps,
  ManagerPrimaryButtonProps,
  ManagerSecondaryButtonProps,
  ManagerSectionProps,
  ManagerSelectProps,
  ManagerTextareaProps,
} from "./managerWorkspace.types";

export function ManagerModal(props: ManagerModalProps) {
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

export function ManagerSection(props: ManagerSectionProps) {
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

export function ManagerField(props: ManagerFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-bold text-slate-800">{props.label}</span>
      {props.hint ? <span className="block text-xs text-slate-500">{props.hint}</span> : null}
      {props.children}
    </label>
  );
}

export function ManagerInput(props: ManagerInputProps) {
  const className =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";
  return <input {...props} className={`${className} ${props.className || ""}`.trim()} />;
}

export function ManagerTextarea(props: ManagerTextareaProps) {
  const className =
    "min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";
  return <textarea {...props} className={`${className} ${props.className || ""}`.trim()} />;
}

export function ManagerSelect(props: ManagerSelectProps) {
  const className =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100";
  return <select {...props} className={`${className} ${props.className || ""}`.trim()} />;
}

export function ManagerActionRow(props: ManagerActionRowProps) {
  return <div className="flex flex-wrap items-center justify-end gap-2 pt-2">{props.children}</div>;
}

export function ManagerPrimaryButton(props: ManagerPrimaryButtonProps) {
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

export function ManagerSecondaryButton(props: ManagerSecondaryButtonProps) {
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
    <button type="button" onClick={props.onClick} disabled={props.disabled} className={className}>
      {props.children}
    </button>
  );
}

export function ManagerDangerButton(props: ManagerButtonProps & { children: ReactNode }) {
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
