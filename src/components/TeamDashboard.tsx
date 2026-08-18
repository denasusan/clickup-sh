"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { Board, Profile, Task } from "@/types/database";
import { STATUS_META, computeTeamRows } from "@/lib/teamStats";

export default function TeamDashboard({
  board,
  tasks,
  members,
  onClose,
}: {
  board: Board;
  tasks: Task[];
  members: { profile: Profile }[];
  onClose: () => void;
}) {
  const rows = useMemo(() => computeTeamRows(tasks, members), [tasks, members]);

  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Dashboard Tim</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Jumlah task per status untuk setiap anggota di board {board.name}.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          {STATUS_META.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              {s.label}
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-6 text-center text-xs text-gray-400">
            Belum ada task di board ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="pb-2 pr-3 font-medium">Anggota</th>
                  <th className="w-40 pb-2 pr-3 font-medium">Progres</th>
                  {STATUS_META.map((s) => (
                    <th key={s.key} className="pb-2 pr-3 text-right font-medium">
                      {s.label}
                    </th>
                  ))}
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-gray-100">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
                          {row.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate text-gray-700">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="h-4 w-full max-w-[160px] overflow-hidden rounded-md bg-gray-100">
                        <div
                          className="flex h-full gap-[2px]"
                          style={{ width: `${(row.total / maxTotal) * 100}%` }}
                        >
                          {row.total > 0 &&
                            STATUS_META.map((s) => {
                              const count = row.counts[s.key];
                              if (count === 0) return null;
                              return (
                                <div
                                  key={s.key}
                                  tabIndex={0}
                                  title={`${s.label}: ${count} task`}
                                  className="h-full outline-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-gray-400"
                                  style={{
                                    width: `${(count / row.total) * 100}%`,
                                    backgroundColor: s.color,
                                  }}
                                />
                              );
                            })}
                        </div>
                      </div>
                    </td>
                    {STATUS_META.map((s) => (
                      <td
                        key={s.key}
                        className="py-2 pr-3 text-right text-gray-600"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {row.counts[s.key]}
                      </td>
                    ))}
                    <td
                      className="py-2 text-right font-medium text-gray-800"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
