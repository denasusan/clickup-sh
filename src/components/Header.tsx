"use client";

import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export default function Header({
  currentUser,
  profiles,
  search,
  onSearchChange,
  assigneeFilter,
  onAssigneeFilterChange,
}: {
  currentUser: { id: string; email: string; full_name: string | null; avatar_url: string | null };
  profiles: Profile[];
  search: string;
  onSearchChange: (value: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (value: string) => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          TF
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-800">TeamFlow</h1>
          <p className="text-xs text-gray-400">Papan kerja tim</p>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3 md:max-w-xl">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari task..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <select
          value={assigneeFilter}
          onChange={(e) => onAssigneeFilterChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">Semua anggota</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name ?? p.email}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <div
          title={currentUser.full_name ?? currentUser.email}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
        >
          {(currentUser.full_name ?? currentUser.email).slice(0, 1).toUpperCase()}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </header>
  );
}
