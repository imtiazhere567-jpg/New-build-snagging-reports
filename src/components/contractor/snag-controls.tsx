"use client";

import { useMemo } from "react";
import { UserX, Wand2 } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { Dot, Dropdown, type DropdownOption } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { useStore } from "@/lib/data/store";
import { STATUS_META, TRADE_LABEL } from "@/lib/constants";
import type { Snag, SnagStatus } from "@/lib/types";

export const STATUS_ORDER: SnagStatus[] = ["submitted", "quoted", "accepted", "assigned", "in_progress", "fixed", "verified", "reopened", "declined"];

export function useStatusOptions(): DropdownOption[] {
  return useMemo(
    () => STATUS_ORDER.map((st) => ({ value: st, label: STATUS_META[st].label, leading: <Dot className={STATUS_META[st].dot} /> })),
    [],
  );
}

export function useAssigneeOptions(trade?: Snag["trade"]): DropdownOption[] {
  const users = useStore((s) => s.users);
  return useMemo(() => {
    const team = users.filter((u) => u.role === "team");
    const matching = team.filter((m) => m.trade === trade);
    const others = team.filter((m) => m.trade !== trade);
    const opt = (m: (typeof team)[number], group: string): DropdownOption => ({
      value: m.id,
      label: m.name,
      hint: TRADE_LABEL[m.trade!],
      leading: <Avatar user={m} size={20} />,
      group,
    });
    return [
      { value: "", label: "Unassigned", leading: <UserX className="size-4 text-muted" /> },
      ...matching.map((m) => opt(m, "Matches this trade")),
      ...others.map((m) => opt(m, trade ? "Rest of the team" : "Team")),
    ];
  }, [users, trade]);
}

/** Contractor controls inside the snag side panel. Every change is written to the timeline. */
export function SnagControls({ snag }: { snag: Snag }) {
  const setSnagStatus = useStore((s) => s.setSnagStatus);
  const assignSnags = useStore((s) => s.assignSnags);
  const autoAssign = useStore((s) => s.autoAssign);
  const setDueDate = useStore((s) => s.setDueDate);
  const statusOptions = useStatusOptions();
  const assigneeOptions = useAssigneeOptions(snag.trade);

  return (
    <div className="mt-4 rounded-2xl border border-line p-4">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Manage</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[12px] text-muted">Status</p>
          <Dropdown label="Status" value={snag.status} onChange={(v) => setSnagStatus([snag.id], v as SnagStatus)} options={statusOptions} menuWidth={220} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[12px] text-muted">Assigned to</p>
            {!snag.assigneeId && (
              <button onClick={() => autoAssign([snag.id])} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700 hover:underline">
                <Wand2 className="size-3" /> Auto-assign
              </button>
            )}
          </div>
          <Dropdown
            label="Assigned to"
            value={snag.assigneeId ?? ""}
            onChange={(v) => assignSnags([snag.id], v || null)}
            options={assigneeOptions}
            menuWidth={260}
            align="right"
          />
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[12px] text-muted">Target date</p>
          <DatePicker
            label="Target date"
            value={snag.dueDate ? snag.dueDate.slice(0, 10) : ""}
            onChange={(v) => setDueDate([snag.id], v ? new Date(v + "T12:00:00").toISOString() : null)}
            placeholder="No target date"
          />
        </div>
      </div>
    </div>
  );
}
