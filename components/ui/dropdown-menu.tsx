"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const toggle = React.useCallback(() => {
    setOpen((o) => !o);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Put the open handler on the real trigger (e.g. `Button` → native <button>).
  // A wrapper <div onClick> around <button> does not receive the click in some UAs / embedded preview.
  const triggerProps = (
    React.isValidElement(trigger) ? (trigger as React.ReactElement) : null
  )?.props as { onClick?: React.MouseEventHandler<unknown>; type?: string } | undefined;

  const renderedTrigger = React.isValidElement(trigger)
    ? React.cloneElement(trigger as React.ReactElement, {
        type: triggerProps?.type ?? "button",
        onClick: (e: React.MouseEvent<unknown>) => {
          triggerProps?.onClick?.(e);
          if (!e.defaultPrevented) {
            toggle();
          }
        },
        "aria-haspopup": "menu" as const,
        "aria-expanded": open,
      } as React.HTMLAttributes<HTMLElement> & { type?: string } & { "aria-expanded"?: boolean })
    : (
        <div className="inline-block" onClick={toggle} role="presentation">
          {trigger}
        </div>
      );

  return (
    <div className="relative" ref={menuRef}>
      {renderedTrigger}
      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 min-w-[200px] rounded-lg border border-border bg-card py-1.5 shadow-xl z-50",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  destructive,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center px-3 py-2 text-sm transition-colors",
        destructive
          ? "text-red-400 hover:bg-red-500/10"
          : "text-foreground hover:bg-accent",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1.5 h-px bg-border" />;
}



