"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { Dot, Dropdown } from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/data/store";
import { CATEGORIES, SEVERITIES, SEVERITY_META, TRADE_LABEL } from "@/lib/constants";
import type { Category, Severity, Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Guess the trade from the category so owners rarely need to pick one. */
const TRADE_FOR: Partial<Record<Category, Trade>> = {
  Cracks: "plasterer",
  Paintwork: "painter",
  "Plaster/Drylining": "plasterer",
  Tiling: "tiler",
  "Sealant/Silicone": "general",
  "Carpentry/Joinery": "carpenter",
  Doors: "carpenter",
  Windows: "carpenter",
  Flooring: "general",
  Plumbing: "plumber",
  Electrical: "electrician",
  "Kitchen units/Worktops": "kitchen fitter",
  Sanitaryware: "plumber",
  "Brickwork/Pointing": "bricklayer",
  Roofing: "roofer",
  "Drainage/External": "groundworker",
  "Insulation/Loft": "general",
  "Cleaning/Debris": "cleaner",
};

/** Owner adds a snag without AI (no photo, or the AI found nothing). Render only while open. */
export function ManualSnagModal({
  propertyId,
  roomId,
  photoUrl,
  onClose,
}: {
  propertyId: string;
  roomId: string;
  photoUrl?: string;
  onClose: () => void;
}) {
  const rooms = useStore((s) => s.rooms);
  const addManualSnag = useStore((s) => s.addManualSnag);
  const homeRooms = rooms.filter((r) => r.propertyId === propertyId).sort((a, b) => a.sortOrder - b.sortOrder);
  const [room, setRoom] = useState(roomId);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Other");
  const [severity, setSeverity] = useState<Severity>("minor");
  const [touched, setTouched] = useState(false);
  const titleError = !title.trim() ? "Say what's wrong in a few words" : undefined;

  const save = () => {
    setTouched(true);
    if (titleError) return;
    addManualSnag({
      propertyId,
      roomId: room,
      title: title.trim(),
      description: description.trim() || title.trim(),
      locationInRoom: location.trim(),
      category,
      severity,
      trade: TRADE_FOR[category] ?? "general",
      photoUrl,
    });
    toast({ title: "Snag added", body: "It's in your list, ready to send." });
    onClose();
  };

  const field = (err?: string) =>
    cn(
      "w-full rounded-xl border bg-surface px-3 text-[14px] outline-none placeholder:text-faint focus:ring-2",
      err && touched ? "border-red-400 focus:ring-red-500/15" : "border-line-strong focus:border-brand-500 focus:ring-brand-500/15",
    );

  return (
    <Modal
      open
      onClose={onClose}
      icon={<PencilLine className="size-5" />}
      title="Add a snag by hand"
      description="For anything the camera can't show, or the AI missed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Add snag</Button>
        </>
      }
    >
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Your photo" className="mb-4 h-36 w-full rounded-xl object-cover" />
      )}
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-2">Room</p>
          <Dropdown label="Room" value={room} onChange={setRoom} options={homeRooms.map((r) => ({ value: r.id, label: r.name }))} />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">What&apos;s wrong?</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Radiator cold at the top" className={cn(field(titleError), "h-11")} />
          {touched && titleError && <span className="mt-1 block text-[12px] text-red-600">{titleError}</span>}
        </label>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-[13px] font-medium text-ink-2">Where exactly? <span className="font-normal text-faint">Optional</span></span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Under the window" className={cn(field(), "h-11")} />
        </label>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-[13px] font-medium text-ink-2">More detail <span className="font-normal text-faint">Optional</span></span>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={cn(field(), "resize-none py-2.5")} />
        </label>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-2">How serious is it?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                aria-pressed={severity === s}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium",
                  severity === s ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:bg-sunken",
                )}
              >
                <span className={cn("size-2 rounded-full", SEVERITY_META[s].dot)} /> {SEVERITY_META[s].label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            {severity === "safety" ? "Could hurt someone (loose rail, exposed wiring, trip hazard)." : severity === "major" ? "Stops something working or could get worse (leak, door won't close)." : severity === "minor" ? "Needs fixing but there's no risk (small gap, loose trim)." : "Looks only (paint splash, small scuff)."}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-2">Type of problem</p>
          <Dropdown
            label="Type"
            value={category}
            onChange={(v) => setCategory(v as Category)}
            menuWidth={260}
            options={CATEGORIES.map((c) => ({ value: c, label: c, hint: TRADE_FOR[c] ? TRADE_LABEL[TRADE_FOR[c]!] : undefined, leading: <Dot className="bg-line-strong" /> }))}
          />
        </div>
      </div>
    </Modal>
  );
}
