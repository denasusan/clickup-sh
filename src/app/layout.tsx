import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowspace",
  description: "Papan kerja tim - kanban board untuk task management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
