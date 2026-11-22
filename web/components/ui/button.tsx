import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Props = ComponentProps<"button"> & { asChild?: boolean; variant?: "default" | "outline" | "ghost" | "danger"; size?: "default" | "icon" };
export function Button({ asChild, variant = "default", size = "default", className, ...props }: Props) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn("button", "button-" + variant, size === "icon" && "icon-button", className)} {...props} />;
}
