export default function Loading() {
  return (
    <main className="min-h-screen bg-[#faf9f7]">
      <div className="mx-auto max-w-5xl animate-pulse px-4 pt-6 sm:px-6">
        <div className="h-4 w-32 rounded bg-stone-200" />
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-3xl border border-[#e7e5e4] bg-white p-9">
            <div className="h-8 w-3/4 rounded bg-stone-200" />
            <div className="mt-3 h-4 w-1/2 rounded bg-stone-100" />
            <div className="mt-6 space-y-3">
              <div className="h-4 rounded bg-stone-100" />
              <div className="h-4 rounded bg-stone-100" />
              <div className="h-4 w-5/6 rounded bg-stone-100" />
            </div>
          </div>
          <div className="rounded-3xl border border-[#e7e5e4] bg-white p-6">
            <div className="h-8 w-2/3 rounded bg-stone-200" />
            <div className="mt-4 h-12 rounded-xl bg-stone-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
