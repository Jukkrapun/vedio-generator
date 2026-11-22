"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clapperboard, Settings2, Workflow } from "lucide-react";
import { Brand } from "./common";
import { ThemeToggle } from "./theme";
import { Button } from "./ui/button";

const links = [{ href: "/", text: "วันนี้", icon: CalendarDays }, { href: "/episodes", text: "คลิป", icon: Clapperboard }, { href: "/jobs", text: "สร้าง/งาน", icon: Workflow }];

function Nav({ className }: { className: string }) {
  const pathname = usePathname();
  return <nav className={className} aria-label="เมนูหลัก">{links.map(({ href, text, icon: Icon }) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={20} />{text}</Link>;
  })}</nav>;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="shell">
    <aside className="sidebar"><Link href="/" aria-label="ตอนตีสอง"><Brand /></Link><Nav className="side-nav" /><div className="sidebar-bottom"><span className="online-dot" />เชื่อมต่อแล้ว</div></aside>
    <div className="workspace">
      <header className="topbar"><Link className="mobile-brand" href="/"><Brand /></Link><span className="desktop-context"><span className="online-dot" />จัดการช่อง</span>
        <div className="top-actions"><ThemeToggle /><Button asChild variant="ghost" size="icon"><Link href="/settings" aria-label="ตั้งค่า" aria-current={pathname === "/settings" ? "page" : undefined} title="ตั้งค่า"><Settings2 size={20} /></Link></Button></div>
      </header>
      <main className="main">{children}</main>
    </div><Nav className="bottom-nav" />
  </div>;
}
