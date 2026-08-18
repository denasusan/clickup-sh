"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Profile, Task } from "@/types/database";
import { STATUS_META } from "@/lib/teamStats";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const STATUS_COLOR = Object.fromEntries(STATUS_META.map((s) => [s.key, s.color]));

export default function CalendarView({
  tasks,
  profilesById,
  onTaskClick,
  onClose,
}: {
  tasks: Task[];
  profilesById: Record<string, Profile>;
  onTaskClick: (task: Task) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date;
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const unscheduledCount = tasks.filter((t) => !t.due_date).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Kalender Task</h2>
            <p className="text-xs text-gray-400">
              Task disusun berdasarkan tenggat waktu.
              {unscheduledCount > 0 && ` ${unscheduledCount} task belum punya tenggat.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </button>
            <h3 className="ml-1 text-sm font-semibold text-gray-800">
              {format(month, "MMMM yyyy", { locale: idLocale })}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {STATUS_META.map((s) => (
              <div key={s.key} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                {s.label}
              </div>
            ))}
            <button
              onClick={() => setMonth(startOfMonth(new Date()))}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Hari ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-t border-gray-100 text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 gap-px overflow-y-auto bg-gray-100">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, month);
            const shown = dayTasks.slice(0, 3);
            const overflow = dayTasks.length - shown.length;

            return (
              <div
                key={key}
                className={clsx(
                  "min-h-[104px] bg-white p-1.5",
                  !inMonth && "bg-gray-50/60"
                )}
              >
                <div
                  className={clsx(
                    "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    isToday(day)
                      ? "bg-brand-600 font-semibold text-white"
                      : inMonth
                      ? "text-gray-600"
                      : "text-gray-300"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="flex flex-col gap-1">
                  {shown.map((t) => {
                    const overdue = t.status !== "done" && isPast(day) && !isSameDay(day, new Date());
                    const assignee = t.assignee_id ? profilesById[t.assignee_id] : null;
                    return (
                      <button
                        key={t.id}
                        onClick={() => onTaskClick(t)}
                        title={`${t.title}${assignee ? ` - ${assignee.full_name ?? assignee.email}` : ""}`}
                        className={clsx(
                          "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] transition hover:brightness-95",
                          overdue ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"
                        )}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: STATUS_COLOR[t.status] }}
                          aria-hidden
                        />
                        <span className="truncate">{t.title}</span>
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="px-1.5 text-[10px] text-gray-400">+{overflow} lainnya</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
