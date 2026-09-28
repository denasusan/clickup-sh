const COLUMN_SKELETONS = [
  { title: "Request Masuk", accent: "bg-violet-400", cards: 0 },
  { title: "Belum Dikerjakan", accent: "bg-gray-400", cards: 3 },
  { title: "Sedang Dikerjakan", accent: "bg-amber-400", cards: 2 },
  { title: "Perlu Review", accent: "bg-sky-400", cards: 1 },
  { title: "Selesai", accent: "bg-emerald-500", cards: 4 },
  { title: "Dibatalkan", accent: "bg-red-400", cards: 1 },
];

export default function BoardLoading() {
  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-800" />
          <div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="order-3 h-9 w-full max-w-xl flex-1 animate-pulse rounded-lg bg-slate-900 sm:order-none" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-800" />
      </header>

      <div className="flex items-center gap-1.5 border-b border-slate-800 bg-slate-950 px-6 py-2">
        {[16, 20, 14].map((w, i) => (
          <div key={i} className="h-7 w-24 animate-pulse rounded-lg bg-slate-900" style={{ width: `${w * 0.35}rem` }} />
        ))}
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden p-3 sm:gap-4 sm:p-6">
        {COLUMN_SKELETONS.map((col) => (
          <div key={col.title} className="flex w-[85vw] max-w-80 shrink-0 flex-col p-1.5 sm:w-80">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className={`h-2 w-2 rounded-full ${col.accent}`} />
              <span className="h-3.5 w-24 animate-pulse rounded bg-slate-800" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: col.cards }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div className="mb-2 h-3.5 w-4/5 rounded bg-slate-800" />
                  <div className="mb-3 h-3 w-3/5 rounded bg-slate-800/70" />
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-5 rounded-full bg-slate-800" />
                    <div className="h-3 w-10 rounded bg-slate-800/70" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
