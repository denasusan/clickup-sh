export default function WorkspaceBoardsLoading() {
  return (
    <div className="flex h-screen flex-col bg-[#f4f5fb]">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
      </header>
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
      </div>
    </div>
  );
}
