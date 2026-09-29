import type { Metadata } from "next";
import Script from "next/script";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowspace",
  description: "Papan kerja tim - kanban board untuk task management.",
};

// Default "dark" kalau belum ada preferensi tersimpan (tema board saat ini),
// dijalankan sebelum hydration supaya tidak ada kedipan terang sekilas.
const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  if (t !== "light") document.documentElement.classList.add("dark");
} catch (e) {
  document.documentElement.classList.add("dark");
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
