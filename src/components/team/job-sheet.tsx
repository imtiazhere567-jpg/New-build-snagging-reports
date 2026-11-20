"use client";

import { useRef, useState } from "react";
import { CalendarClock, Camera, CheckCircle2, Clock, Loader2, MapPin, MessageSquarePlus, Phone, Play, RotateCcw, Wrench, X } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Avatar, Button, RefTag, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/data/store";
import { isOverdue } from "@/lib/data/queries";
import { compressImage, shrinkDataUrl } from "@/lib/image";
import { cn, formatDate, timeAgo } from "@/lib/utils";

type Mode = "view" | "update" | "fixed";

/** Everything a tradesperson needs for one job, plus Start / Post update / Mark fixed. Render only while open. */
export function JobSheet({ snagId, onClose }: { snagId: string; onClose: () => void }) {
  const snag = useStore((s) => s.snags.find((x) => x.id === snagId));
  const property = useStore((s) => s.properties.find((p) => p.id === snag?.propertyId));
  const owner = useStore((s) => s.users.find((u) => u.id === property?.ownerId));
  const room = useStore((s) => s.rooms.find((r) => r.id === snag?.roomId));
  const allUpdates = useStore((s) => s.updates);
  const users = useStore((s) => s.users);
  const me = useStore((s) => s.currentUserId);
  const { startJob, postProgress, markFixed } = useStore.getState();
  const [mode, setMode] = useState<Mode>("view");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!snag || !property) return null;
  const history = allUpdates.filter((u) => u.snagId === snag.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reopenNote = snag.status === "reopened" ? history.find((u) => u.toStatus === "reopened")?.note : undefined;
  const late = isOverdue(snag);

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const { dataUrl } = await compressImage(f);
      setPhoto(await shrinkDataUrl(dataUrl));
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setMode("view");
    setNote("");
    setPhoto(null);
  };

  const submit = () => {
    if (mode === "update") {
      postProgress(snag.id, note.trim(), photo ?? undefined);
      toast({ title: "Update posted", body: `${owner?.name} and the office can see it.` });
    } else if (mode === "fixed") {
      markFixed(snag.id, note.trim(), photo ?? undefined);
      toast({ title: `${snag.ref} marked as fixed`, body: `${owner?.name} has been asked to check it.` });
    }
    reset();
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={<Wrench className="size-5" />}
      title={snag.title}
      description={`${snag.ref} · ${room?.name}`}
      footer={
        mode !== "view" ? (
          <>
            <Button variant="secondary" onClick={reset}>Cancel</Button>
            <Button onClick={submit} disabled={busy || (mode === "update" && !note.trim())}>
              {mode === "fixed" ? <><CheckCircle2 className="size-4" /> Mark as fixed</> : <><MessageSquarePlus className="size-4" /> Post update</>}
            </Button>
          </>
        ) : snag.status === "assigned" || snag.status === "reopened" || snag.status === "accepted" ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              startJob(snag.id);
              toast({ title: "Job started", body: `${owner?.name} can see you're on it.` });
            }}
          >
            <Play className="size-4" /> Start job
          </Button>
        ) : snag.status === "in_progress" ? (
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => setMode("update")}><MessageSquarePlus className="size-4" /> Post update</Button>
            <Button size="lg" onClick={() => setMode("fixed")}><CheckCircle2 className="size-4" /> Mark fixed</Button>
          </div>
        ) : (
          <p className="mr-auto flex items-center gap-2 text-[13px] text-muted">
            {snag.status === "fixed" ? <><Clock className="size-4" /> Waiting for the owner to check</> : <><CheckCircle2 className="size-4 text-emerald-600" /> Owner confirmed it&apos;s fixed</>}
          </p>
        )
      }
    >
      {mode === "view" ? (
        <>
          <SnagPhoto snag={snag} className="aspect-[4/3] w-full" />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <RefTag>{snag.ref}</RefTag>
            <StatusBadge status={snag.status} />
            <SeverityBadge severity={snag.severity} />
            {snag.dueDate && (
              <span className={cn("ml-auto inline-flex items-center gap-1 text-[12px]", late ? "font-semibold text-sev-major" : "text-muted")}>
                <CalendarClock className="size-3.5" /> {late ? "Overdue" : `Due ${formatDate(snag.dueDate)}`}
              </span>
            )}
          </div>

          {reopenNote && (
            <p className="mt-3 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800">
              <RotateCcw className="mt-0.5 size-4 shrink-0" /> <span><b>Sent back by the owner:</b> {reopenNote}</span>
            </p>
          )}

          {/* Where */}
          <div className="mt-3 rounded-xl bg-canvas p-3">
            <p className="flex items-start gap-2 text-[13px]">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
              <span>
                <span className="font-medium">{property.addressLine1}, {property.town} {property.postcode}</span>
                <span className="block text-muted">{property.plot} · {room?.name} · {snag.locationInRoom}</span>
              </span>
            </p>
            {owner && (
              <div className="mt-2.5 flex items-center gap-2.5 border-t border-line pt-2.5">
                <Avatar user={owner} size={28} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{owner.name}</span>
                {owner.phone && (
                  <a href={`tel:${owner.phone.replace(/\s/g, "")}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-[12.5px] font-medium">
                    <Phone className="size-3.5" /> Call
                  </a>
                )}
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-3 text-[13.5px] leading-relaxed">
            <div>
              <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted">The problem</dt>
              <dd className="mt-0.5 text-ink-2">{snag.description}</dd>
            </div>
            {snag.suggestedFix && (
              <div>
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted">Suggested fix</dt>
                <dd className="mt-0.5 text-ink-2">{snag.suggestedFix}</dd>
              </div>
            )}
          </dl>

          {history.length > 0 && (
            <>
              <p className="mt-5 mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted">History</p>
              <ol className="space-y-2.5">
                {history.map((u) => {
                  const who = u.actorId === me ? "You" : users.find((x) => x.id === u.actorId)?.name ?? "SnagSnap";
                  return (
                    <li key={u.id} className="rounded-xl border border-line p-2.5 text-[12.5px]">
                      <p>
                        <span className="font-medium">{who}</span>{" "}
                        <span className="text-ink-2">{u.kind === "progress" ? "posted an update" : u.toStatus ? `→ ${u.toStatus.replace("_", " ")}` : "updated"}</span>{" "}
                        <span className="text-faint">· {timeAgo(u.createdAt)}</span>
                      </p>
                      {u.note && <p className="mt-1 text-ink-2">{u.note}</p>}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {u.photoUrl && <img src={u.photoUrl} alt="Photo from this update" className="mt-2 h-28 w-full rounded-lg object-cover" />}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </>
      ) : (
        /* Post update / Mark fixed form */
        <div className="space-y-3">
          <p className="text-[13px] text-muted">
            {mode === "fixed" ? `A photo of the finished work helps ${owner?.name.split(/\s|&/)[0]} confirm it quickly.` : "Let the owner and the office know how it's going."}
          </p>
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mode === "fixed" ? "e.g. Tile replaced and regrouted to match." : "e.g. Part ordered, back Thursday to fit it."}
            aria-label={mode === "fixed" ? "Note about the fix" : "Progress update"}
            className="w-full resize-none rounded-xl border border-line-strong px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
          {photo ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Your photo" className="h-44 w-full rounded-xl object-cover" />
              <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 rounded-full bg-ink/70 p-1.5 text-white" aria-label="Remove photo"><X className="size-4" /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="flex h-24 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong text-[13.5px] font-medium text-ink-2 hover:bg-canvas">
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />} {mode === "fixed" ? "Add a photo of the fix" : "Add a photo (optional)"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (void pickPhoto(e.target.files?.[0]), (e.target.value = ""))} aria-label="Add photo" />
        </div>
      )}
    </Modal>
  );
}
