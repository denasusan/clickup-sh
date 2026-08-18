"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Download, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Task, TaskPriority, TaskStatus } from "@/types/database";

const STATUS_ALIASES: Record<string, TaskStatus> = {
  todo: "todo",
  "to do": "todo",
  "belum dikerjakan": "todo",
  belum: "todo",
  backlog: "todo",
  in_progress: "in_progress",
  "in progress": "in_progress",
  "sedang dikerjakan": "in_progress",
  progress: "in_progress",
  doing: "in_progress",
  done: "done",
  selesai: "done",
  completed: "done",
  complete: "done",
};

const PRIORITY_ALIASES: Record<string, TaskPriority> = {
  low: "low",
  rendah: "low",
  medium: "medium",
  sedang: "medium",
  normal: "medium",
  high: "high",
  tinggi: "high",
  urgent: "urgent",
  mendesak: "urgent",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Belum Dikerjakan",
  in_progress: "Sedang Dikerjakan",
  done: "Selesai",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

// Titik-koma, bukan koma - default pemisah CSV di Excel lokal Indonesia/Eropa,
// supaya kolom kebaca kesebar waktu template ini dibuka & diisi di Excel.
const TEMPLATE_CSV =
  "judul;deskripsi;status;prioritas;assignee_email;tenggat\n" +
  '"Desain halaman landing";"Bikin wireframe dulu";todo;high;;2026-09-01\n' +
  '"Setup database";"";in_progress;medium;teman@perusahaan.com;\n';

interface ParsedRow {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeText: string;
  dueDate: string | null;
  warnings: string[];
  valid: boolean;
}

function normalizeDate(raw: string): { value: string | null; warning: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, warning: null };
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { value: trimmed, warning: null };
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return { value: parsed.toISOString().slice(0, 10), warning: `Tanggal "${trimmed}" ditafsir jadi ${parsed.toISOString().slice(0, 10)}` };
  }
  return { value: null, warning: `Tanggal "${trimmed}" tidak dikenali, dikosongkan` };
}

export default function ImportTasksModal({
  boardId,
  tasks,
  members,
  onClose,
  onImported,
}: {
  boardId: string;
  tasks: Task[];
  members: { profile: Profile }[];
  onClose: () => void;
  onImported: (tasks: Task[]) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const membersByEmail = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const m of members) {
      if (m.profile.email) map[m.profile.email.trim().toLowerCase()] = m.profile;
    }
    return map;
  }, [members]);

  const validRows = rows.filter((r) => r.valid);

  function handleDownloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-task-flowspace.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(file: File) {
    setParseError(null);
    setImportError(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          setParseError(result.errors[0].message);
        }
        const parsed: ParsedRow[] = result.data.map((raw) => {
          const warnings: string[] = [];
          const title = (raw.judul ?? raw.title ?? "").trim();

          const statusRaw = (raw.status ?? "").trim().toLowerCase();
          let status: TaskStatus = "todo";
          if (statusRaw) {
            const matched = STATUS_ALIASES[statusRaw];
            if (matched) status = matched;
            else warnings.push(`Status "${raw.status}" tidak dikenali, dipakai "Belum Dikerjakan"`);
          }

          const priorityRaw = (raw.prioritas ?? raw.priority ?? "").trim().toLowerCase();
          let priority: TaskPriority = "medium";
          if (priorityRaw) {
            const matched = PRIORITY_ALIASES[priorityRaw];
            if (matched) priority = matched;
            else warnings.push(`Prioritas "${raw.prioritas}" tidak dikenali, dipakai "Sedang"`);
          }

          const assigneeText = (raw.assignee_email ?? raw.assignee ?? "").trim();
          let assigneeId: string | null = null;
          if (assigneeText) {
            const found = membersByEmail[assigneeText.toLowerCase()];
            if (found) assigneeId = found.id;
            else warnings.push(`Assignee "${assigneeText}" tidak ditemukan di anggota workspace, dikosongkan`);
          }

          const dueRaw = (raw.tenggat ?? raw.due_date ?? "").trim();
          const { value: dueDate, warning: dueWarning } = normalizeDate(dueRaw);
          if (dueWarning) warnings.push(dueWarning);

          if (!title) warnings.push("Judul kosong - baris ini dilewati");

          return {
            title,
            description: (raw.deskripsi ?? raw.description ?? "").trim() || null,
            status,
            priority,
            assigneeId,
            assigneeText,
            dueDate,
            warnings,
            valid: Boolean(title),
          };
        });
        setRows(parsed);
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    setImportError(null);

    const nextPosition: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
    (["todo", "in_progress", "done"] as TaskStatus[]).forEach((s) => {
      const max = tasks.filter((t) => t.status === s).reduce((m, t) => Math.max(m, t.position), -1);
      nextPosition[s] = max + 1;
    });

    const payload = validRows.map((r) => ({
      board_id: boardId,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      assignee_id: r.assigneeId,
      due_date: r.dueDate,
      position: nextPosition[r.status]++,
    }));

    const CHUNK = 200;
    const inserted: Task[] = [];
    for (let i = 0; i < payload.length; i += CHUNK) {
      const chunk = payload.slice(i, i + CHUNK);
      const { data, error } = await supabase.from("tasks").insert(chunk).select().returns<Task[]>();
      if (error) {
        setImportError(error.message);
        setImporting(false);
        if (inserted.length > 0) onImported(inserted);
        return;
      }
      if (data) inserted.push(...data);
    }

    setImporting(false);
    onImported(inserted);
    onClose();
  }

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
          <h2 className="text-lg font-semibold text-gray-800">Impor Task dari Spreadsheet</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Upload file CSV (export dari Excel / Google Sheets). Kolom yang dikenali:{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">judul, deskripsi, status, prioritas, assignee_email, tenggat</code>.
          Cuma <code className="rounded bg-gray-100 px-1 py-0.5">judul</code> yang wajib diisi.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <Download size={13} />
            Unduh template CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-700"
          >
            <Upload size={13} />
            Pilih file CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {fileName && <span className="text-xs text-gray-500">{fileName}</span>}
        </div>

        {parseError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{parseError}</p>
        )}
        {importError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            Gagal impor sebagian/semua task: {importError}
          </p>
        )}

        {rows.length > 0 && (
          <>
            <p className="mb-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{validRows.length}</span> task siap diimpor
              {rows.length > validRows.length && (
                <span className="text-amber-600"> - {rows.length - validRows.length} baris dilewati (judul kosong)</span>
              )}
            </p>
            <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Judul</th>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="px-2 py-1.5 font-medium">Prioritas</th>
                    <th className="px-2 py-1.5 font-medium">Tenggat</th>
                    <th className="px-2 py-1.5 font-medium">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t border-gray-100 ${!r.valid ? "opacity-40" : ""}`}>
                      <td className="px-2 py-1.5 text-gray-700">{r.title || "(kosong)"}</td>
                      <td className="px-2 py-1.5 text-gray-600">{STATUS_LABEL[r.status]}</td>
                      <td className="px-2 py-1.5 text-gray-600">{PRIORITY_LABEL[r.priority]}</td>
                      <td className="px-2 py-1.5 text-gray-600">{r.dueDate ?? "-"}</td>
                      <td className="px-2 py-1.5 text-amber-600">{r.warnings.join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={validRows.length === 0 || importing}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {importing ? "Mengimpor..." : `Impor ${validRows.length} Task`}
          </button>
        </div>
      </div>
    </div>
  );
}
