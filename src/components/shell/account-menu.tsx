"use client";

import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Repeat2, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { useStore } from "@/lib/data/store";
import { isDemo } from "@/lib/config";
import { TRADE_LABEL } from "@/lib/constants";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** In-memory notice so the login page can say "You've signed out" (works even when Next reuses the page). */
export const useSignOutNotice = create<{ shown: boolean; set: (v: boolean) => void }>((set) => ({ shown: false, set: (v) => set({ shown: v }) }));

const ROLE_LABEL = { contractor: "Contractor (admin)", owner: "Home owner", team: "Team member" } as const;

/**
 * Account menu with Sign out, for every role.
 * variant "sidebar": the contractor's name block at the bottom of the dark sidebar (menu opens upwards).
 * variant "avatar": the avatar button in the owner/team phone header (menu opens downwards).
 */
export function AccountMenu({ user, variant }: { user: User; variant: "sidebar" | "avatar" }) {
  const router = useRouter();
  const signOut = useStore((s) => s.signOut);
  const company = useStore((s) => s.settings.name);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const doSignOut = () => {
    setOpen(false);
    useSignOutNotice.getState().set(true);
    router.push("/login");
    signOut();
  };
  const doSwitch = () => {
    setOpen(false);
    signOut();
    router.push("/login");
  };

  const subtitle = user.role === "team" && user.trade ? TRADE_LABEL[user.trade] : user.role === "contractor" ? user.title : ROLE_LABEL[user.role];

  return (
    <div ref={rootRef} className={cn("relative", variant === "sidebar" && "w-full")}>
      {variant === "sidebar" ? (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.06]", open && "bg-white/[0.08]")}
        >
          <Avatar user={user} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
            <p className="truncate text-[12px] text-white/45">{subtitle}</p>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-white/40" />
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className={cn("rounded-full ring-offset-2 ring-offset-canvas transition-shadow", open ? "ring-2 ring-brand-500" : "hover:ring-2 hover:ring-line-strong")}
        >
          <Avatar user={user} size={30} />
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-lift animate-fade-up [animation-duration:150ms]",
            variant === "sidebar" ? "bottom-[calc(100%+8px)] left-0" : "top-[calc(100%+8px)] right-0",
          )}
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <Avatar user={user} size={36} />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold">{user.name}</p>
              <p className="truncate text-[12px] text-muted">{user.email}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-faint">
                {ROLE_LABEL[user.role]}
                {user.role !== "owner" ? ` · ${company}` : ""}
              </p>
            </div>
          </div>
          <div className="p-1.5">
            {user.role === "contractor" && (
              <Link role="menuitem" href="/contractor/settings" onClick={() => setOpen(false)} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-sunken">
                <Settings className="size-4 text-muted" /> Settings
              </Link>
            )}
            {isDemo && (
              <button role="menuitem" onClick={doSwitch} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-sunken">
                <Repeat2 className="size-4 text-muted" /> Switch account
                <span className="ml-auto rounded bg-sunken px-1.5 text-[10.5px] font-semibold text-muted uppercase">Demo</span>
              </button>
            )}
            <button role="menuitem" onClick={doSignOut} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
