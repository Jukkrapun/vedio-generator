"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => { setLight(document.documentElement.dataset.theme === "light"); }, []);
  function toggle() {
    const next = !light;
    document.documentElement.dataset.theme = next ? "light" : "dark";
    localStorage.setItem("ops-theme", next ? "light" : "dark");
    setLight(next);
  }
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label={light ? "เปิดธีมมืด" : "เปิดธีมสว่าง"} title={light ? "เปิดธีมมืด" : "เปิดธีมสว่าง"}>{light ? <Moon size={19} /> : <Sun size={19} />}</Button>;
}
