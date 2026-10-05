"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange } from "lucide-react";

function formatShort(value: string) {
  const [, m, d] = value.split("-");
  return `${d}/${m}`;
}

export default function DateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = Boolean(fromDate && toDate);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Filter task yang selesai di rentang tanggal"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition ${
          active
            ? "border-brand-500/40 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
            : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
        }`}
      >
        <CalendarRange size={15} />
        <span className="hidden sm:inline">
          {active ? `${formatShort(fromDate)} - ${formatShort(toDate)}` : "Tanggal selesai"}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
          <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">
            Tampilkan cuma task yang selesai di rentang ini - task lain
            disembunyikan sementara filter aktif.
          </p>
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                Dari tanggal
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                Sampai tanggal
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
          {active && (
            <button
              type="button"
              onClick={() => {
                onFromDateChange("");
                onToDateChange("");
              }}
              className="mt-2 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              Reset filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
