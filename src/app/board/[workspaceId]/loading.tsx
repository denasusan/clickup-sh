export default function WorkspaceBoardsLoading() {
  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-3 py-3 sm:px-6 sm:py-4">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-800" />
        <div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
      </header>
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-800 border-t-brand-500" />
      </div>
    </div>
  );
}
