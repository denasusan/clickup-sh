# TeamFlow

Aplikasi task management sederhana ala ClickUp untuk tim kecil: kanban board (drag & drop), assign task ke anggota tim, deadline, prioritas, dan update **realtime** — begitu satu orang mengubah task, semua anggota tim lain langsung melihat perubahannya tanpa refresh.

Dibangun dengan **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase** (database, auth, realtime), siap deploy ke **Vercel**.

Login mendukung **Google** dan **email/password**.

---

## 1. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) → Sign up / login → **New project**.
2. Catat **Database Password** yang kamu buat (untuk jaga-jaga, jarang dipakai langsung).
3. Setelah project selesai dibuat (±1-2 menit), buka menu **SQL Editor** di sidebar kiri.
4. Buka file [`supabase/schema.sql`](./supabase/schema.sql) di project ini, copy semua isinya, paste ke SQL Editor, lalu klik **Run**.
   - Ini akan membuat tabel `profiles`, `tasks`, aturan keamanan (RLS), trigger otomatis, dan mengaktifkan Realtime.
5. Buka menu **Project Settings → API**. Catat dua nilai ini (dipakai di langkah 4):
   - **Project URL**
   - **anon public key**

---

## 2. Aktifkan login Google (opsional tapi direkomendasikan)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project baru (atau pakai yang sudah ada).
2. Buka **APIs & Services → OAuth consent screen** → pilih **External** → isi nama app, email, dll → simpan.
3. Buka **APIs & Services → Credentials** → **Create Credentials → OAuth client ID** → tipe **Web application**.
4. Isi:
   - **Authorized JavaScript origins**: `http://localhost:3000` dan URL Vercel kamu nanti (misal `https://teamflow-kamu.vercel.app`)
   - **Authorized redirect URIs**: `https://<PROJECT-REF>.supabase.co/auth/v1/callback` (lihat PROJECT-REF di Project Settings → API → Project URL)
5. Setelah dibuat, copy **Client ID** dan **Client Secret**.
6. Di Supabase Dashboard → **Authentication → Providers → Google** → aktifkan (Enable) → paste Client ID & Client Secret → **Save**.
7. Di Supabase Dashboard → **Authentication → URL Configuration**:
   - **Site URL**: isi dengan URL Vercel kamu nanti (untuk sekarang bisa `http://localhost:3000` dulu, update lagi setelah deploy).
   - **Redirect URLs**: tambahkan `http://localhost:3000/auth/callback` dan `https://teamflow-kamu.vercel.app/auth/callback`.

> Kalau belum sempat setup Google, tidak masalah — form login **email & password** tetap berfungsi penuh tanpa langkah di atas. Kamu bisa aktifkan Google kapan saja nanti.

---

## 3. Jalankan di komputer sendiri (opsional, untuk coba-coba dulu)

```bash
npm install
cp .env.example .env.local
```

Buka `.env.local`, isi dengan Project URL & anon key dari langkah 1:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Lalu jalankan:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## 4. Deploy ke Vercel

1. Push project ini ke repository GitHub (buat repo baru, lalu `git init`, `git add .`, `git commit`, `git push`).
2. Buka [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo GitHub tadi.
3. Saat konfigurasi, tambahkan **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klik **Deploy**. Setelah selesai, kamu akan dapat URL seperti `https://teamflow-kamu.vercel.app`.
5. Kembali ke Supabase → **Authentication → URL Configuration** → update **Site URL** dan **Redirect URLs** dengan URL Vercel yang sebenarnya (lihat langkah 2.7).
6. Kalau pakai Google login, update juga **Authorized JavaScript origins** di Google Cloud Console dengan URL Vercel-nya.

Selesai — bagikan link Vercel-nya ke anggota tim, mereka tinggal daftar/login dan langsung bisa pakai board yang sama secara realtime.

---

## Fitur

- Login email/password + Google OAuth (Supabase Auth)
- Satu board bersama untuk seluruh tim (semua user yang login melihat data yang sama)
- 3 kolom: **Belum Dikerjakan / Sedang Dikerjakan / Selesai**
- Drag & drop task antar kolom dan reorder dalam kolom
- Tambah / edit / hapus task: judul, deskripsi, prioritas, assignee, tenggat waktu
- Pencarian task & filter berdasarkan anggota tim
- Update realtime — perubahan dari satu user langsung tampil ke semua user lain
- Badge tenggat waktu yang lewat (overdue) berwarna merah

## Struktur project

```
src/
  app/
    login/page.tsx        -> halaman login (Google + email/password)
    auth/callback/route.ts -> handler OAuth callback
    board/page.tsx         -> halaman board (server component, fetch data awal)
  components/
    Board.tsx    -> logic utama: drag & drop, realtime, CRUD task
    Column.tsx   -> satu kolom kanban
    TaskCard.tsx -> kartu task
    TaskModal.tsx-> form tambah/edit task
    Header.tsx   -> search, filter, sign out
  lib/supabase/  -> client Supabase (browser, server, middleware)
supabase/schema.sql -> skema database + RLS policies
```

## Ide pengembangan lanjutan

- Tambah komentar per task
- Tambah lampiran file (pakai Supabase Storage)
- Multi-board / multi-workspace per tim
- Notifikasi email saat ditugaskan task baru
- Tampilan kalender/timeline

---

**Catatan:** kode ini ditulis lengkap secara manual (belum sempat dijalankan `npm run build` langsung oleh asisten karena keterbatasan akses jaringan di sandbox). Struktur dan API yang dipakai mengikuti dokumentasi resmi Next.js 14 App Router, `@supabase/ssr`, dan `@dnd-kit`. Kalau setelah `npm install` ada error kecil terkait versi package, jalankan `npm install` ulang atau beri tahu saya error-nya untuk saya bantu perbaiki.
