import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ops-tracker",
  description:
    "Authenticated project and task tracking for small operations teams."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="mesh" />
        <div className="relative min-h-screen">{children}</div>
      </body>
    </html>
  );
}
