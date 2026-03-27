import type { Metadata } from "next";
import { Toaster } from "sonner";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Meal Tracking",
  description: "Lunch and dinner meal tracking connected to an active plan."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
