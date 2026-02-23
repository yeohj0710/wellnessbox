import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

export function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatJson(data: unknown) {
  if (data == null) return "-";
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function uniqueList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => !!value))
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
      : "bg-gray-100 text-gray-700 ring-1 ring-gray-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

export function JsonBox({
  data,
  maxHeightClass = "max-h-80",
}: {
  data: unknown;
  maxHeightClass?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 shadow-inner overflow-auto ${maxHeightClass}`}
    >
      <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">
        {formatJson(data)}
      </pre>
    </div>
  );
}

export function AccordionCard({
  title,
  subtitle,
  right,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-extrabold text-gray-900">
              {title}
            </h2>
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {right ? <div className="hidden sm:block">{right}</div> : null}
          <ChevronDownIcon className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}

export function MiniAccordion({
  title,
  subtitle,
  right,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-gray-100 bg-gray-50"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-extrabold text-gray-900">
              {title}
            </div>
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {right}
          <ChevronDownIcon className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-gray-100 px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}

export function InfoGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-gray-900">
        {value}
      </div>
    </div>
  );
}

