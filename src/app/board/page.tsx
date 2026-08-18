import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Board from "@/components/Board";
import type { Profile, Task } from "@/types/database";

export default async function BoardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profiles }, { data: tasks }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name").returns<Profile[]>(),
    supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true })
      .returns<Task[]>(),
  ]);

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .returns<Profile[]>()
    .single();

  return (
    <Board
      initialTasks={tasks ?? []}
      profiles={profiles ?? []}
      currentUser={{
        id: user.id,
        email: user.email ?? "",
        full_name: currentProfile?.full_name ?? null,
        avatar_url: currentProfile?.avatar_url ?? null,
      }}
    />
  );
}
