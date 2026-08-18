import { createBrowserClient } from "@supabase/ssr";

// Catatan: sengaja tidak memakai generic <Database> di sini supaya tidak
// tergantung pada bentuk persis tipe internal Supabase (yang bisa berbeda
// antar versi @supabase/supabase-js dan sering jadi sumber error build).
// Tipe hasil query ditegaskan langsung di tiap pemanggilan lewat `.returns<T>()`,
// dan tipe Task/Profile dari "@/types/database" dipakai di level komponen.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
