"use client";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { createContext, useContext, useState, type ComponentProps, type FormEvent, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

/** Set by <AsyncForm> while its onSubmit promise runs, so its submit button shows a spinner. */
const FormPending = createContext(false);

type Props = Omit<ComponentProps<"button">, "onClick"> & {
  asChild?: boolean; variant?: "default" | "outline" | "ghost" | "danger"; size?: "default" | "icon";
  /** May return a promise: the button then shows a spinner and stays disabled until it settles. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => unknown;
  pending?: boolean;
};

export function Button({ asChild, variant = "default", size = "default", className, onClick, pending, disabled, children, ...props }: Props) {
  const [running, setRunning] = useState(false);
  const formPending = useContext(FormPending) && props.type === "submit";
  const busy = !!pending || running || formPending;
  const Component = asChild ? Slot : "button";
  const handle = onClick && ((event: MouseEvent<HTMLButtonElement>) => {
    if (busy) { event.preventDefault(); return; }
    const result = onClick(event);
    if (result instanceof Promise) {
      setRunning(true);
      result.catch(() => undefined).finally(() => setRunning(false));
    }
  });
  if (asChild) return <Component className={cn("button", "button-" + variant, size === "icon" && "icon-button", className)} onClick={handle} {...props}>{children}</Component>;
  return <button className={cn("button", "button-" + variant, size === "icon" && "icon-button", busy && "is-busy", className)}
    onClick={handle} disabled={disabled || busy} aria-busy={busy || undefined} {...props}>
    {busy && <Loader2 size={15} className="spin" aria-hidden />}{size === "icon" && busy ? null : children}
  </button>;
}

/** <form> whose async onSubmit disables its submit button (with a spinner) until the promise settles. */
export function AsyncForm({ onSubmit, children, ...props }: Omit<ComponentProps<"form">, "onSubmit"> & { onSubmit: (event: FormEvent<HTMLFormElement>) => unknown }) {
  const [pending, setPending] = useState(false);
  return <form {...props} aria-busy={pending || undefined} onSubmit={event => {
    if (pending) { event.preventDefault(); return; }
    const result = onSubmit(event);
    if (result instanceof Promise) {
      setPending(true);
      result.catch(() => undefined).finally(() => setPending(false));
    }
  }}><FormPending.Provider value={pending}>{children}</FormPending.Provider></form>;
}
