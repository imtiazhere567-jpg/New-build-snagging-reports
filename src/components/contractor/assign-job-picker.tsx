"use client";

import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Dot, Dropdown, type DropdownOption } from "@/components/ui/dropdown";
import { useStore } from "@/lib/data/store";
import { OPEN_WORK, SEVERITY_META, TRADE_LABEL } from "@/lib/constants";

/** Lets the contractor hand any open job to a specific team member. */
export function AssignJobPicker({ memberId }: { memberId: string }) {
  const snags = useStore((s) => s.snags);
  const users = useStore((s) => s.users);
  const properties = useStore((s) => s.properties);
  const assignSnags = useStore((s) => s.assignSnags);
  const [last, setLast] = useState<string | null>(null);
  const member = users.find((u) => u.id === memberId);

  const options = useMemo<DropdownOption[]>(() => {
    const candidates = snags.filter((s) => (OPEN_WORK.includes(s.status) || s.status === "accepted") && s.assigneeId !== memberId);
    const label = (s: (typeof snags)[number]) => `${s.ref} · ${s.title}`;
    const hint = (s: (typeof snags)[number]) => {
      const p = properties.find((x) => x.id === s.propertyId);
      const who = users.find((u) => u.id === s.assigneeId);
      return `${p?.addressLine1} · ${TRADE_LABEL[s.trade]} · ${who ? `with ${who.name.split(" ")[0]}` : "unassigned"}`;
    };
    const opt = (s: (typeof snags)[number], group: string): DropdownOption => ({
      value: s.id,
      label: label(s),
      hint: hint(s),
      leading: <Dot className={SEVERITY_META[s.severity].dot} />,
      group,
    });
    const unassigned = candidates.filter((s) => !s.assigneeId);
    const trade = candidates.filter((s) => s.assigneeId && s.trade === member?.trade);
    const rest = candidates.filter((s) => s.assigneeId && s.trade !== member?.trade);
    return [
      { value: "__", label: "Choose a job to assign…" },
      ...unassigned.map((s) => opt(s, "Unassigned")),
      ...trade.map((s) => opt(s, `${TRADE_LABEL[member?.trade ?? "general"]} jobs with someone else`)),
      ...rest.map((s) => opt(s, "Other open jobs")),
    ];
  }, [snags, users, properties, memberId, member?.trade]);

  if (!member) return null;
  const first = member.name.split(" ")[0];

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50/40 p-3.5">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <Plus className="size-4 text-brand-600" /> Assign a job to {first}
      </p>
      {options.length > 1 ? (
        <Dropdown
          label={`Assign to ${first}`}
          value="__"
          menuWidth={420}
          onChange={(v) => {
            if (v === "__") return;
            assignSnags([v], memberId);
            setLast(snags.find((s) => s.id === v)?.ref ?? null);
          }}
          options={options}
        />
      ) : (
        <p className="text-[12.5px] text-muted">There are no other open jobs to give {first} right now.</p>
      )}
      {last && (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-brand-700" role="status">
          <Check className="size-3.5" /> {last} assigned to {first}. It now shows in their job list.
        </p>
      )}
    </div>
  );
}
