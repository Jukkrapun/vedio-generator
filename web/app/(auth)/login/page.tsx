"use client";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/common";
import { ThemeToggle } from "@/components/theme";
import { AsyncForm, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  return <main className="login"><div className="login-theme"><ThemeToggle /></div>
    <Card className="login-card"><Brand /><h1>เข้าสู่ระบบ</h1><p className="muted">สำหรับผู้ดูแลช่องตอนตีสอง</p>
      <AsyncForm onSubmit={async event => {
        event.preventDefault();
        const password = new FormData(event.currentTarget).get("password");
        const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
        if (!response.ok) { toast.error((await response.json().catch(() => ({}))).error ?? "รหัสผ่านไม่ถูกต้อง"); return; }
        router.replace("/");
        router.refresh();
      }}>
        <label>รหัสผ่าน<div className="input-icon"><LockKeyhole size={17} /><input name="password" type="password" autoComplete="current-password" placeholder="กรอกรหัสผ่าน" required /></div></label>
        <Button type="submit">เข้าสู่ระบบ</Button>
      </AsyncForm>
    </Card>
  </main>;
}
