import type { Metadata } from "next";
import { Nunito, Fraunces } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const body = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-body" });
const display = Fraunces({ subsets: ["latin"], weight: "variable", variable: "--font-display", axes: ["SOFT", "WONK", "opsz"] });

export const metadata: Metadata = {
  title: "Ressler Training Hub",
  description: "Training initiatives, visits, and progress across the Ressler stores",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
