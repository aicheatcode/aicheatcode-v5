import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AICHEATCODE — Prompt Playground",
  description: "Pustaka prompt dan studio suntingan AICHEATCODE.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body className="antialiased">{children}</body>
    </html>
  );
}
