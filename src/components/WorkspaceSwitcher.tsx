"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import type { Workspace } from "@/types/database";

export default function WorkspaceSwitcher({
  workspace,
  workspaces,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        {workspace.name}
        <ChevronDown size={14} className="text-gray-400 dark:text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
          <p className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
            Workspace
          </p>
          {workspaces.map((w) => (
            <Link
              key={w.id}
              href={`/board/${w.id}`}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-2 py-1.5 text-sm transition hover:bg-gray-100 dark:hover:bg-slate-800 ${
                w.id === workspace.id ? "font-medium text-brand-700 dark:text-brand-300" : "text-gray-700 dark:text-slate-300"
              }`}
            >
              {w.name}
            </Link>
          ))}
          <div className="my-1 h-px bg-gray-100 dark:bg-slate-800" />
          <Link
            href="/board/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/15"
          >
            <Plus size={14} />
            Workspace baru
          </Link>
        </div>
      )}
    </div>
  );
}
