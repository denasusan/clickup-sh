"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, TaskComment } from "@/types/database";

export default function TaskComments({
  taskId,
  profilesById,
  currentUser,
}: {
  taskId: string;
  profilesById: Record<string, Profile>;
  currentUser: { id: string; email: string; full_name: string | null };
}) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
      .returns<TaskComment[]>()
      .then(({ data }) => {
        if (!cancelled) {
          setComments(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, taskId]);

  useEffect(() => {
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` },
        (payload) => {
          setComments((current) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as TaskComment;
              if (current.some((c) => c.id === row.id)) return current;
              return [...current, row];
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as { id: string };
              return current.filter((c) => c.id !== row.id);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, taskId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("task_comments")
      .insert({ task_id: taskId, author_id: currentUser.id, body: body.trim() })
      .select()
      .returns<TaskComment[]>()
      .single();
    setSending(false);
    if (!error && data) {
      setComments((current) =>
        current.some((c) => c.id === data.id) ? current : [...current, data]
      );
      setBody("");
    }
  }

  async function handleDelete(id: string) {
    setComments((current) => current.filter((c) => c.id !== id));
    await supabase.from("task_comments").delete().eq("id", id);
  }

  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="mb-2 text-xs font-medium text-gray-600">
        Komentar {comments.length > 0 && `(${comments.length})`}
      </p>

      <div className="mb-3 max-h-48 space-y-3 overflow-y-auto">
        {loading && <p className="text-xs text-gray-400">Memuat komentar...</p>}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-gray-400">Belum ada komentar.</p>
        )}
        {comments.map((c) => {
          const author = c.author_id ? profilesById[c.author_id] : null;
          const authorName = author?.full_name ?? author?.email ?? "User";
          return (
            <div key={c.id} className="flex gap-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
                {authorName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-700">{authorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">
                      {formatDistanceToNow(new Date(c.created_at), {
                        addSuffix: true,
                        locale: idLocale,
                      })}
                    </span>
                    {c.author_id === currentUser.id && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-gray-300 transition hover:text-red-500"
                        aria-label="Hapus komentar"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-xs text-gray-600">{c.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Tulis komentar..."
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-60"
          aria-label="Kirim komentar"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
