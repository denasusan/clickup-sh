import type { Profile, Task, TaskStatus } from "@/types/database";

// Warna disamakan persis dengan titik aksen kolom kanban di Board.tsx
// (Tailwind gray-400 / amber-400 / emerald-500), supaya dashboard & sidebar
// konsisten sama board-nya. Karena gray-400 nyaris tanpa saturasi, identitas
// warnanya nggak berdiri sendiri - makanya selalu dipasangkan label teks
// langsung (nama kolom/legenda/tabel), bukan cuma warna.
export const STATUS_META: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "Belum Dikerjakan", color: "#9ca3af" },
  { key: "in_progress", label: "Sedang Dikerjakan", color: "#fbbf24" },
  { key: "done", label: "Selesai", color: "#10b981" },
];

export interface TeamRow {
  key: string;
  name: string;
  counts: Record<TaskStatus, number>;
  total: number;
}

export function computeTeamRows(
  tasks: Task[],
  members: { profile: Profile }[]
): TeamRow[] {
  const byPerson = new Map<string, TeamRow>();
  for (const m of members) {
    byPerson.set(m.profile.id, {
      key: m.profile.id,
      name: m.profile.full_name ?? m.profile.email ?? "User",
      counts: { todo: 0, in_progress: 0, done: 0 },
      total: 0,
    });
  }
  const unassigned: TeamRow = {
    key: "unassigned",
    name: "Belum ditugaskan",
    counts: { todo: 0, in_progress: 0, done: 0 },
    total: 0,
  };

  for (const t of tasks) {
    const row = t.assignee_id ? byPerson.get(t.assignee_id) : undefined;
    const target = row ?? unassigned;
    target.counts[t.status] += 1;
    target.total += 1;
  }

  const result = Array.from(byPerson.values());
  if (unassigned.total > 0) result.push(unassigned);
  return result.sort((a, b) => b.total - a.total);
}
