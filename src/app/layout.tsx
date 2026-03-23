import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sleeper Fantasy Intel",
  description: "AI-powered fantasy football assistant for Sleeper leagues",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
