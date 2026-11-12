import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Back to the Past",
  description:
    "Travel through a website's history. Watch it live, die, and change — narrated by a spooky AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void text-bone antialiased">
        {children}
      </body>
    </html>
  );
}
