"use client";
import * as Dialog from "@radix-ui/react-dialog";
import * as Alert from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function Modal({ open, close, title, description, children, sheet }: { open: boolean; close: () => void; title: string; description?: string; children: ReactNode; sheet?: boolean }) {
  return <Dialog.Root open={open} onOpenChange={next => { if (!next) close(); }}>
    <Dialog.Portal><Dialog.Overlay className="overlay" />
      <Dialog.Content className={"modal" + (sheet ? " sheet" : "")} {...(!description && { "aria-describedby": undefined })}>
        <header><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="ปิด"><X size={19} /></Button></Dialog.Close></header>
        {description && <Dialog.Description className="muted">{description}</Dialog.Description>}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function Confirm({ open, close, title, description, action, confirmLabel, children, destructive }: { open: boolean; close: () => void; title: string; description: string; action: () => void; confirmLabel: string; children?: ReactNode; destructive?: boolean }) {
  return <Alert.Root open={open} onOpenChange={next => { if (!next) close(); }}>
    <Alert.Portal><Alert.Overlay className="overlay" />
      <Alert.Content className="modal">
        <Alert.Title>{title}</Alert.Title><Alert.Description className="muted">{description}</Alert.Description>
        {children}
        <footer className="modal-actions"><Alert.Cancel asChild><Button variant="outline">ยกเลิก</Button></Alert.Cancel>
          <Alert.Action asChild><Button variant={destructive ? "danger" : "default"} onClick={action}>{confirmLabel}</Button></Alert.Action></footer>
      </Alert.Content>
    </Alert.Portal>
  </Alert.Root>;
}
