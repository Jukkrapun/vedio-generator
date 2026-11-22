"use client";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/common";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  return <main className="login"><div className="login-theme"><ThemeToggle /></div>
    <Card className="login-card"><Brand /><h1>เข้าสู่ระบบ</h1><p className="muted">สำหรับผู้ดูแลช่องตอนตีสอง</p>
      <form onSubmit={event => {
        event.preventDefault();
        const password = new FormData(event.currentTarget).get("password");
        if (typeof password !== "string" || !password.trim()) { toast.error("รหัสผ่านไม่ถูกต้อง"); return; }
        router.push("/");
      }}>
        <label>รหัสผ่าน<div className="input-icon"><LockKeyhole size={17} /><input name="password" type="password" autoComplete="current-password" placeholder="กรอกรหัสผ่าน" required /></div></label>
        <Button type="submit">เข้าสู่ระบบ</Button>
      </form>
      <p className="small muted">โหมดตัวอย่าง ใช้รหัสผ่านใดก็ได้</p>
    </Card>
  </main>;
}
