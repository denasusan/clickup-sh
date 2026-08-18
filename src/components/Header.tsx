"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarDays, Download, LogOut, Search, Upload, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Workspace, WorkspaceRole } from "@/types/database";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import MembersModal from "./MembersModal";
import EditProfileModal from "./EditProfileModal";

export default function Header({
  currentUser,
  workspace,
  workspaces,
  members,
  myRole,
  search,
  onSearchChange,
  assigneeFilter,
  onAssigneeFilterChange,
  onOpenDashboard,
  onOpenImport,
  onExport,
  onOpenCalendar,
}: {
  currentUser: { id: string; email: string; full_name: string | null; avatar_url: string | null };
  workspace: Workspace;
  workspaces: Workspace[];
  members: { profile: Profile; role: WorkspaceRole }[];
  myRole: WorkspaceRole;
  search: string;
  onSearchChange: (value: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (value: string) => void;
  onOpenDashboard: () => void;
  onOpenImport: () => void;
  onExport: () => void;
  onOpenCalendar: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showMembers, setShowMembers] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          FS
        </div>
        <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} />
      </div>

      <div className="order-3 flex w-full flex-col gap-2 sm:order-none sm:w-auto sm:flex-1 sm:flex-row sm:items-center sm:gap-3 md:max-w-xl">
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:w-auto"
        >
          <option value="all">Semua anggota</option>
          <option value="unassigned">Belum ditugaskan</option>
          {members.map((m) => (
            <option key={m.profile.id} value={m.profile.id}>
              {m.profile.full_name ?? m.profile.email}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <button
          onClick={onOpenImport}
          title="Impor"
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 sm:px-3"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Impor</span>
        </button>
        <button
          onClick={onExport}
          title="Ekspor"
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 sm:px-3"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Ekspor</span>
        </button>
        <button
          onClick={onOpenCalendar}
          title="Kalender"
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 sm:px-3"
        >
          <CalendarDays size={14} />
          <span className="hidden sm:inline">Kalender</span>
        </button>
        <button
          onClick={onOpenDashboard}
          title="Dashboard"
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 sm:px-3"
        >
          <BarChart3 size={14} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <button
          onClick={() => setShowMembers(true)}
          title="Anggota"
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 sm:px-3"
        >
          <Users size={14} />
          <span className="hidden sm:inline">Anggota</span>
        </button>
        <button
          onClick={() => setShowEditProfile(true)}
          title={`Edit profil (${currentUser.full_name ?? currentUser.email})`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 transition hover:ring-2 hover:ring-brand-300"
        >
          {(currentUser.full_name ?? currentUser.email).slice(0, 1).toUpperCase()}
        </button>
        <button
          onClick={handleSignOut}
          title="Keluar"
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 sm:px-3"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>

      {showMembers && (
        <MembersModal
          workspaceId={workspace.id}
          joinCode={workspace.join_code}
          members={members}
          myRole={myRole}
          currentUserId={currentUser.id}
          onClose={() => setShowMembers(false)}
        />
      )}

      {showEditProfile && (
        <EditProfileModal
          userId={currentUser.id}
          currentName={currentUser.full_name ?? ""}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </header>
  );
}
