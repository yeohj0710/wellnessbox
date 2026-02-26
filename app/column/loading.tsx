export default function ColumnLoading() {
  return (
    <section className="min-h-[calc(100vh-7rem)] w-full bg-[radial-gradient(circle_at_top_left,_#d8f6eb_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-4 h-8 w-56 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-3/4 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-2/3 rounded bg-slate-200" />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5">
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="h-7 w-20 rounded-full bg-slate-200" />
              <div className="h-7 w-24 rounded-full bg-slate-200" />
              <div className="h-7 w-20 rounded-full bg-slate-200" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6">
            <div className="h-5 w-2/3 rounded bg-slate-200" />
            <div className="mt-4 h-40 rounded-2xl bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded bg-slate-200" />
            <div className="mt-2 h-4 w-4/5 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </section>
  );
}
