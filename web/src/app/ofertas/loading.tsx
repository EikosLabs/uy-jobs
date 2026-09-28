export default function Loading() {
  return (
    <main className="min-h-screen bg-[#faf9f7]">
      <div className="mx-auto max-w-6xl animate-pulse px-4 sm:px-6">
        <div className="flex gap-2 py-6">
          <div className="h-12 flex-1 rounded-xl bg-stone-200" />
          <div className="h-12 w-28 rounded-xl bg-stone-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#e7e5e4] bg-white p-6">
              <div className="h-5 w-2/3 rounded bg-stone-200" />
              <div className="mt-3 h-4 w-1/2 rounded bg-stone-100" />
              <div className="mt-3 h-16 rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
