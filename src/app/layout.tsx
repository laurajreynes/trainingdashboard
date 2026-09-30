import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Ressler Training Hub",
  description: "Training initiatives, visits, and progress across the Ressler stores",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={body.variable} style={{ ["--font-display" as string]: "var(--font-body)" }}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
