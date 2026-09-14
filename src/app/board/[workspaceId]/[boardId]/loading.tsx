const COLUMN_SKELETONS = [
  { title: "Belum Dikerjakan", accent: "bg-gray-300", cards: 3 },
  { title: "Sedang Dikerjakan", accent: "bg-amber-200", cards: 2 },
  { title: "Selesai", accent: "bg-emerald-200", cards: 4 },
  { title: "Dibatalkan", accent: "bg-red-200", cards: 1 },
];

export default function BoardLoading() {
  return (
    <div className="flex h-screen flex-col bg-[#f4f5fb]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="order-3 h-9 w-full max-w-xl flex-1 animate-pulse rounded-lg bg-gray-100 sm:order-none" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      </header>

      <div className="flex items-center gap-1.5 border-b border-gray-200 bg-white px-6 py-2">
        {[16, 20, 14].map((w, i) => (
          <div key={i} className="h-7 w-24 animate-pulse rounded-lg bg-gray-100" style={{ width: `${w * 0.35}rem` }} />
        ))}
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden p-3 sm:gap-4 sm:p-6">
        {COLUMN_SKELETONS.map((col) => (
          <div key={col.title} className="flex w-[85vw] max-w-80 shrink-0 flex-col rounded-2xl bg-gray-100/70 p-3 sm:w-80">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className={`h-2 w-2 rounded-full ${col.accent}`} />
              <span className="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: col.cards }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-white p-3 shadow-sm">
                  <div className="mb-2 h-3.5 w-4/5 rounded bg-gray-200" />
                  <div className="mb-3 h-3 w-3/5 rounded bg-gray-100" />
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-5 rounded-full bg-gray-200" />
                    <div className="h-3 w-10 rounded bg-gray-100" />
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
