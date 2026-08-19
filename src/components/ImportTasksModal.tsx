"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Download, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Task, TaskPriority, TaskStatus, TaskTeam } from "@/types/database";

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

const TEAM_ALIASES: Record<string, TaskTeam> = {
  product: "product",
  marketing: "marketing",
  operasional: "operasional",
  operational: "operasional",
  it: "it",
  program: "program",
};

const TEAM_LABEL: Record<TaskTeam, string> = {
  product: "Product",
  marketing: "Marketing",
  operasional: "Operasional",
  it: "IT",
  program: "Program",
};

// Titik-koma, bukan koma - default pemisah CSV di Excel lokal Indonesia/Eropa,
// supaya kolom kebaca kesebar waktu template ini dibuka & diisi di Excel.
const TEMPLATE_CSV =
  "judul;deskripsi;status;prioritas;assignee_email;tenggat;team\n" +
  '"Desain halaman landing";"Bikin wireframe dulu";todo;high;;2026-09-01;marketing\n' +
  '"Setup database";"";in_progress;medium;teman@perusahaan.com;;it\n';

interface ParsedRow {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeText: string;
  dueDate: string | null;
  team: TaskTeam | null;
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
  onImported: (tasks: Task[], replacedExisting: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState<"deleting" | "inserting" | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

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

          const teamRaw = (raw.team ?? raw.tim ?? "").trim().toLowerCase();
          let team: TaskTeam | null = null;
          if (teamRaw) {
            const matched = TEAM_ALIASES[teamRaw];
            if (matched) team = matched;
            else warnings.push(`Tim "${raw.team ?? raw.tim}" tidak dikenali, dikosongkan`);
          }

          if (!title) warnings.push("Judul kosong - baris ini dilewati");

          return {
            title,
            description: (raw.deskripsi ?? raw.description ?? "").trim() || null,
            status,
            priority,
            assigneeId,
            assigneeText,
            dueDate,
            team,
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
    setImportProgress(0);

    if (replaceExisting) {
      setImportStage("deleting");
      const { error: deleteError } = await supabase.from("tasks").delete().eq("board_id", boardId);
      if (deleteError) {
        setImportError(`Gagal menghapus task lama: ${deleteError.message}`);
        setImporting(false);
        setImportStage(null);
        return;
      }
    }

    setImportStage("inserting");

    const nextPosition: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
    if (!replaceExisting) {
      (["todo", "in_progress", "done"] as TaskStatus[]).forEach((s) => {
        const max = tasks.filter((t) => t.status === s).reduce((m, t) => Math.max(m, t.position), -1);
        nextPosition[s] = max + 1;
      });
    }

    const payload = validRows.map((r) => ({
      board_id: boardId,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      assignee_id: r.assigneeId,
      due_date: r.dueDate,
      team: r.team,
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
        setImportStage(null);
        if (inserted.length > 0) onImported(inserted, replaceExisting);
        return;
      }
      if (data) inserted.push(...data);
      setImportProgress(inserted.length);
    }

    setImporting(false);
    setImportStage(null);
    onImported(inserted, replaceExisting);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={importing ? undefined : onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Impor Task dari Spreadsheet</h2>
          <button
            onClick={onClose}
            disabled={importing}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Upload file CSV (export dari Excel / Google Sheets). Kolom yang dikenali:{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">
            judul, deskripsi, status, prioritas, assignee_email, tenggat, team
          </code>
          . Cuma <code className="rounded bg-gray-100 px-1 py-0.5">judul</code> yang wajib diisi.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={13} />
            Unduh template CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Upload size={13} />
            Pilih file CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={importing}
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

        {importing && (
          <div className="mb-4 rounded-lg border border-brand-100 bg-brand-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-700">
              <Loader2 size={16} className="animate-spin" />
              {importStage === "deleting"
                ? "Menghapus task lama..."
                : `Mengimpor task... ${importProgress}/${validRows.length}`}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{
                  width:
                    importStage === "deleting"
                      ? "100%"
                      : `${validRows.length > 0 ? (importProgress / validRows.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
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
                    <th className="px-2 py-1.5 font-medium">Tim</th>
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
                      <td className="px-2 py-1.5 text-gray-600">{r.team ? TEAM_LABEL[r.team] : "-"}</td>
                      <td className="px-2 py-1.5 text-gray-600">{r.dueDate ?? "-"}</td>
                      <td className="px-2 py-1.5 text-amber-600">{r.warnings.join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <input
                type="checkbox"
                checked={replaceExisting}
                disabled={importing}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Hapus semua task yang sudah ada di board ini dulu</span>{" "}
                sebelum impor ({tasks.length} task akan dihapus permanen dan diganti data dari file ini).
              </span>
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            disabled={importing}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={validRows.length === 0 || importing}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${
              replaceExisting ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {importing && <Loader2 size={14} className="animate-spin" />}
            {importing
              ? "Mengimpor..."
              : replaceExisting
                ? `Hapus & Impor ${validRows.length} Task`
                : `Impor ${validRows.length} Task`}
          </button>
        </div>
      </div>
    </div>
  );
}
