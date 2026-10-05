"use client";

import { useMemo, useState } from "react";
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

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);

  // "Selesai" di rentang tanggal dihitung dari completed_at, bukan created_at -
  // yang mau diketahui adalah kapan task-nya dikerjakan sampai tuntas, bukan
  // kapan task-nya dibuat.
  const completedTasksInRange = useMemo(() => {
    if (!fromDate || !toDate || invalidRange) return [];
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T23:59:59.999`);
    return tasks.filter((t) => {
      if (t.status !== "done" || !t.completed_at) return false;
      const completedAt = new Date(t.completed_at);
      return completedAt >= from && completedAt <= to;
    });
  }, [tasks, fromDate, toDate, invalidRange]);

  const completedByPerson = useMemo(() => {
    const byPerson = new Map<string, { key: string; name: string; count: number }>();
    for (const m of members) {
      byPerson.set(m.profile.id, {
        key: m.profile.id,
        name: m.profile.full_name ?? m.profile.email ?? "User",
        count: 0,
      });
    }
    let unassigned = 0;
    for (const t of completedTasksInRange) {
      const ids = t.assignee_ids ?? (t.assignee_id ? [t.assignee_id] : []);
      if (ids.length === 0) {
        unassigned += 1;
        continue;
      }
      // Task dengan beberapa assignee dihitung untuk tiap orang, sama seperti
      // tabel status di bawah.
      for (const id of ids) {
        const row = byPerson.get(id);
        if (row) row.count += 1;
      }
    }
    const result = Array.from(byPerson.values()).filter((r) => r.count > 0);
    if (unassigned > 0) result.push({ key: "unassigned", name: "Belum ditugaskan", count: unassigned });
    return result.sort((a, b) => b.count - a.count);
  }, [completedTasksInRange, members]);

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

        <div className="mb-6 rounded-xl border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Task selesai per rentang tanggal
          </h3>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Dari tanggal
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Sampai tanggal
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {invalidRange ? (
            <p className="text-xs text-red-500">
              Tanggal &quot;Dari&quot; harus sebelum atau sama dengan &quot;Sampai&quot;.
            </p>
          ) : !fromDate || !toDate ? (
            <p className="text-xs text-gray-400">
              Pilih kedua tanggal untuk melihat berapa task yang selesai di
              periode itu (khusus board {board.name}).
            </p>
          ) : completedByPerson.length === 0 ? (
            <p className="text-xs text-gray-400">
              Tidak ada task yang selesai di periode ini.
            </p>
          ) : (
            <div className="space-y-1.5">
              {completedByPerson.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="text-gray-700">{row.name}</span>
                  <span className="font-semibold text-gray-800">{row.count} task</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
                <span>Total</span>
                <span>{completedTasksInRange.length} task</span>
              </div>
            </div>
          )}
        </div>

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
