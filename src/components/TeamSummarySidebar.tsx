"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { Profile, Task } from "@/types/database";
import { STATUS_META, computeTeamRows } from "@/lib/teamStats";

export default function TeamSummarySidebar({
  tasks,
  members,
  assigneeFilter,
  onSelectAssignee,
}: {
  tasks: Task[];
  members: { profile: Profile }[];
  assigneeFilter: string;
  onSelectAssignee: (value: string) => void;
}) {
  const allRows = useMemo(() => computeTeamRows(tasks, members), [tasks, members]);
  // Sembunyikan anggota tanpa task sama sekali, kecuali dia sedang jadi
  // filter aktif (mis. filter dipilih lalu task terakhirnya baru dihapus).
  const rows = useMemo(
    () => allRows.filter((r) => r.total > 0 || r.key === assigneeFilter),
    [allRows, assigneeFilter]
  );
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 1000) / 10 : 0;

  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-800 bg-slate-950 p-4 lg:flex">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Ringkasan Tim
      </h3>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        {STATUS_META.map((s) => (
          <div key={s.key} className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            {s.label}
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-slate-900 px-3 py-4 text-center text-xs text-slate-500">
          Belum ada task di board ini.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {assigneeFilter !== "all" && (
            <button
              onClick={() => onSelectAssignee("all")}
              className="mb-1 self-start text-[11px] font-medium text-brand-300 hover:underline"
            >
              Reset filter
            </button>
          )}
          {rows.map((row) => {
            const active = assigneeFilter === row.key;
            return (
              <button
                key={row.key}
                onClick={() => onSelectAssignee(active ? "all" : row.key)}
                className={clsx(
                  "rounded-lg px-2 py-2 text-left transition",
                  active ? "bg-brand-500/10 ring-1 ring-brand-500/40" : "hover:bg-slate-900"
                )}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[9px] font-semibold text-brand-300">
                      {row.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate text-xs text-slate-300">{row.name}</span>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-slate-500">{row.total}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="flex h-full gap-px"
                    style={{ width: `${(row.total / maxTotal) * 100}%` }}
                  >
                    {row.total > 0 &&
                      STATUS_META.map((s) => {
                        const count = row.counts[s.key];
                        if (count === 0) return null;
                        return (
                          <div
                            key={s.key}
                            className="h-full"
                            style={{ width: `${(count / row.total) * 100}%`, backgroundColor: s.color }}
                          />
                        );
                      })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {totalTasks > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Tugas</span>
            <span className="font-semibold text-slate-200">{totalTasks} Task</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Tingkat Penyelesaian</span>
            <span className="font-semibold text-emerald-400">{completionRate}%</span>
          </div>
        </div>
      )}
    </aside>
  );
}
