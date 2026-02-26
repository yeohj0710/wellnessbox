export default function ColumnDetailLoading() {
  return (
    <section className="min-h-[calc(100vh-7rem)] w-full bg-[linear-gradient(180deg,_#f8fafc_0%,_#f0fdf4_36%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <div className="animate-pulse grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="mt-4 h-9 w-3/4 rounded bg-slate-200" />
              <div className="mt-4 h-4 w-full rounded bg-slate-200" />
              <div className="mt-2 h-4 w-5/6 rounded bg-slate-200" />
              <div className="mt-5 h-56 rounded-2xl bg-slate-200" />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="mt-3 h-4 w-11/12 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-10/12 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-9/12 rounded bg-slate-200" />
            </div>
          </div>
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5">
            <div className="h-4 w-16 rounded bg-slate-200" />
            <div className="mt-4 h-3 w-full rounded bg-slate-200" />
            <div className="mt-2 h-3 w-5/6 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-4/6 rounded bg-slate-200" />
          </aside>
        </div>
      </div>
    </section>
  );
}
