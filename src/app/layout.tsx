import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Montserrat } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["800", "900"],
  variable: "--font-montserrat",
});
const caveat = Caveat({ subsets: ["latin", "cyrillic"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: "FocusAI",
  description: "Узнайте, что мешает вашей концентрации, и улучшайте её за минуту в день.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0A2A9E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${montserrat.variable} ${caveat.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}
