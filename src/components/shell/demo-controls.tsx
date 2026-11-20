"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, Inbox, RotateCcw, Repeat2 } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { isDemo } from "@/lib/config";
import { cn } from "@/lib/utils";

/** Compact demo toolbar: inbox, switch role, reset. Hidden in live mode. */
export function DemoControls({ dark, className }: { dark?: boolean; className?: string }) {
  const router = useRouter();
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const role = me?.role;
  const unread = useStore((s) => s.emails.filter((e) => !e.read).length);
  const resetDemo = useStore((s) => s.resetDemo);
  const signOut = useStore((s) => s.signOut);
  if (!isDemo) return null;

  const btn = cn(
    "relative inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors",
    dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-ink-2 hover:bg-sunken",
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        className={cn(
          "mr-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
          dark ? "bg-highlight/15 text-highlight" : "bg-brand-50 text-brand-700",
        )}
      >
        <FlaskConical className="size-3" /> Demo
      </span>
      {role !== "team" && (
      <Link href={role === "contractor" ? "/contractor/inbox" : "/inbox"} className={btn} title="Inbox">
        <Inbox className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9.5px] font-bold text-white">
            {unread}
          </span>
        )}
      </Link>
      )}
      <button
        className={btn}
        title="Switch role"
        onClick={() => {
          signOut();
          router.push("/login");
        }}
      >
        <Repeat2 className="size-4" />
      </button>
      <button
        className={btn}
        title="Reset demo data"
        onClick={() => {
          if (confirm("Reset all demo data to the starting state?")) resetDemo();
        }}
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  );
}
