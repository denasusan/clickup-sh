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
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:flex">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
        Ringkasan Tim
      </h3>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        {STATUS_META.map((s) => (
          <div key={s.key} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            {s.label}
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs text-gray-400 dark:bg-slate-900 dark:text-slate-500">
          Belum ada task di board ini.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {assigneeFilter !== "all" && (
            <button
              onClick={() => onSelectAssignee("all")}
              className="mb-1 self-start text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-300"
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
                  active
                    ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/40"
                    : "hover:bg-gray-50 dark:hover:bg-slate-900"
                )}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      {row.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate text-xs text-gray-700 dark:text-slate-300">{row.name}</span>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-gray-500 dark:text-slate-500">{row.total}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
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
        <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-slate-500">Total Tugas</span>
            <span className="font-semibold text-gray-800 dark:text-slate-200">{totalTasks} Task</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-slate-500">Tingkat Penyelesaian</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completionRate}%</span>
          </div>
        </div>
      )}
    </aside>
  );
}
