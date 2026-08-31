/**
 * URL publik aplikasi, dipakai untuk redirect auth (OAuth & email confirm).
 *
 * Urutan prioritas:
 * 1. NEXT_PUBLIC_SITE_URL - set manual di env (produksi: https://task.sharinghappiness.org)
 * 2. NEXT_PUBLIC_VERCEL_URL - otomatis diisi Vercel di preview deployment
 * 3. window.location.origin - fallback saat jalan di browser (dev)
 * 4. http://localhost:3000 - fallback terakhir (SSR lokal tanpa env)
 */
export function getSiteURL(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : undefined);

  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
