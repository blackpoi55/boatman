import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boatman — API Client",
  description: "A Postman-like API client built with Next.js",
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
