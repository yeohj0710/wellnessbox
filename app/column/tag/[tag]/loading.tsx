export default function ColumnTagLoading() {
  return (
    <section className="min-h-[calc(100vh-7rem)] w-full bg-[radial-gradient(circle_at_top_left,_#eff6ff_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-3/4 rounded bg-slate-200" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="mt-3 h-4 w-11/12 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-10/12 rounded bg-slate-200" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="mt-3 h-4 w-11/12 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-10/12 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </section>
  );
}
