import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-thai", display: "swap" });
export const metadata: Metadata = { title: { default: "ตอนตีสอง · จัดการช่อง", template: "%s · ตอนตีสอง" }, description: "แผงจัดการคลิปและตารางลงโพสต์ของช่องตอนตีสอง" };
const themeScript = 'try { document.documentElement.dataset.theme = localStorage.getItem("ops-theme") === "light" ? "light" : "dark"; } catch {}';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="th" data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body className={thai.variable}>{children}<Toaster position="top-center" closeButton /></body></html>;
}
