"use client";

export default function ResultSectionEmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-600">
      {message}
    </p>
  );
}
