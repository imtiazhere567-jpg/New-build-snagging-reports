"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  CloudOff,
  ImagePlus,
  Info,
  Loader2,
  PencilLine,
  RotateCcw,
  SearchX,
  Smartphone,
  Sparkles,
  Trash2,
  Wifi,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";
import { Button, SeverityBadge } from "@/components/ui/primitives";
import { ManualSnagModal } from "@/components/owner/manual-snag-modal";
import { canUseLiveCamera, LiveCamera } from "@/components/owner/live-camera";
import { useStore } from "@/lib/data/store";
import { analyzePhoto, AnalyseError } from "@/lib/ai/analyze-photo";
import type { Analysis } from "@/lib/ai/schema";
import { compressImage, shrinkDataUrl } from "@/lib/image";
import { cn, formatDate } from "@/lib/utils";

type Phase = "waiting" | "compressing" | "analysing" | "done" | "error";
interface QueueItem {
  id: string;
  roomId: string;
  roomName: string;
  note: string;
  file: File;
  preview?: string;
  phase: Phase;
  analysis?: Analysis;
  source?: "claude" | "demo";
  snagIds?: string[];
  error?: string;
}

const QUICK_NOTES = ["Crack", "Gap", "Paint", "Leak", "Sealant", "Door sticks", "Scratch", "Loose"];
const QUALITY_TEXT: Record<string, string> = {
  blurry: "The photo looks blurry.",
  too_dark: "The photo is too dark.",
  too_far: "The photo was taken from too far away.",
};

// navigator.onLine as a React value
const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export default function CapturePage() {
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))!;
  const property = useStore((s) => s.properties.find((p) => p.ownerId === me.id));
  const rooms = useStore((s) => s.rooms);
  const snags = useStore((s) => s.snags);
  const reports = useStore((s) => s.reports);
  const addAnalysedPhoto = useStore((s) => s.addAnalysedPhoto);
  const deleteSnag = useStore((s) => s.deleteSnag);
  const [removing, setRemoving] = useState<QueueItem | null>(null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const homeRooms = rooms.filter((r) => r.propertyId === property?.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const [roomId, setRoomId] = useState(homeRooms[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [queue, setQueueState] = useState<QueueItem[]>([]);
  // A ref mirrors the queue so the async worker always reads the latest items.
  const queueRef = useRef<QueueItem[]>([]);
  const setQueue = (fn: (q: QueueItem[]) => QueueItem[]) => {
    queueRef.current = fn(queueRef.current);
    setQueueState(queueRef.current);
  };
  const [manual, setManual] = useState<{ roomId: string; photoUrl?: string } | null>(null);
  const [liveOpen, setLiveOpen] = useState(false);
  // Prefer the in-app live camera; fall back to the phone's camera app where it isn't available.
  const openCamera = () => (canUseLiveCamera() ? setLiveOpen(true) : cameraRef.current?.click());
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  const drafts = snags.filter((s) => s.propertyId === property?.id && s.status === "ai_draft");
  const sentReport = reports
    .filter((r) => r.propertyId === property?.id && r.status !== "draft")
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0];
  const room = homeRooms.find((r) => r.id === roomId);

  const patchItem = (id: string, p: Partial<QueueItem>) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, ...p } : x)));

  /** Process waiting photos one at a time; pauses while offline. */
  const pump = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      for (;;) {
        if (!navigator.onLine) break;
        const next = queueRef.current.find((x) => x.phase === "waiting");
        if (!next || !property) break;
        patchItem(next.id, { phase: "compressing" });
        try {
          const { dataUrl } = await compressImage(next.file);
          const stored = await shrinkDataUrl(dataUrl);
          patchItem(next.id, { phase: "analysing", preview: stored });
          const res = await analyzePhoto(dataUrl, next.roomName, next.note);
          const ids = addAnalysedPhoto({
            propertyId: property.id,
            roomId: next.roomId,
            photoUrl: stored,
            note: next.note,
            analysis: res.analysis,
            source: res.source,
            model: res.model,
          });
          patchItem(next.id, { phase: "done", analysis: res.analysis, source: res.source, snagIds: ids });
        } catch (err) {
          patchItem(next.id, { phase: "error", error: err instanceof AnalyseError ? err.message : "Something went wrong with this photo. Try again." });
        }
      }
    } finally {
      busy.current = false;
    }
  };

  // Resume when the signal comes back
  useEffect(() => {
    if (online) void pump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const addFiles = (files: FileList | File[] | null, keepNote = false) => {
    if (!files?.length || !room) return;
    const items: QueueItem[] = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ id: Math.random().toString(36).slice(2), roomId: room.id, roomName: room.name, note: note.trim(), file, phase: "waiting" as Phase }));
    setQueue((q) => [...items, ...q]);
    if (!keepNote) setNote("");
    setTimeout(() => void pump(), 0);
  };

  const retry = (id: string) => {
    patchItem(id, { phase: "waiting", error: undefined });
    setTimeout(() => void pump(), 0);
  };

  if (!property) return <p className="text-muted">No home is linked to this account.</p>;

  const draftsInRoom = (rid: string) => drafts.filter((s) => s.roomId === rid).length;
  /** Remove a photo from this session, and any snags it created that haven't been sent yet. */
  const removeItem = (item: QueueItem) => {
    const unsent = (item.snagIds ?? []).filter((id) => snags.find((x) => x.id === id)?.status === "ai_draft");
    unsent.forEach(deleteSnag);
    setQueue((q) => q.filter((x) => x.id !== item.id));
    setRemoving(null);
    toast({ title: unsent.length ? `Deleted ${unsent.length} ${unsent.length === 1 ? "snag" : "snags"}` : "Photo removed", tone: "info" });
  };
  const unsentCount = (item: QueueItem) => (item.snagIds ?? []).filter((id) => snags.find((x) => x.id === id)?.status === "ai_draft").length;

  const working = queue.some((x) => x.phase === "compressing" || x.phase === "analysing" || x.phase === "waiting");

  return (
    <div className="animate-fade-up space-y-5 pb-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Capture snags</h1>
          <p className="text-[13px] text-muted">{property.addressLine1}, {property.town}</p>
        </div>
        <span
          className={cn(
            "mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
            online ? "bg-brand-50 text-brand-700" : "bg-amber-100 text-amber-800",
          )}
        >
          {online ? <Wifi className="size-3.5" /> : <CloudOff className="size-3.5" />} {online ? "Online" : "Offline"}
        </span>
      </div>

      {!online && (
        <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
          <CloudOff className="mt-0.5 size-4 shrink-0" /> No signal? Keep taking photos. They&apos;re saved on your phone and analysed as soon as you&apos;re back online.
        </p>
      )}
      {sentReport && drafts.length === 0 && queue.length === 0 && (
        <p className="flex gap-2 rounded-xl border border-line bg-surface p-3 text-[12.5px] text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-600" /> You sent a report on {formatDate(sentReport.submittedAt ?? sentReport.createdAt)}. Anything new you capture now goes in a follow-up report.
        </p>
      )}

      {/* 1. Room */}
      <section>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">1 · Which room?</p>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none" role="radiogroup" aria-label="Room">
          {homeRooms.map((r) => {
            const n = draftsInRoom(r.id);
            const active = r.id === roomId;
            return (
              <button
                key={r.id}
                role="radio"
                aria-checked={active}
                onClick={() => setRoomId(r.id)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                  active ? "bg-ink text-white" : "border border-line bg-surface text-ink-2",
                )}
              >
                {r.name}
                {n > 0 && <span className={cn("rounded-full px-1.5 text-[10.5px] font-bold tabular", active ? "bg-highlight text-night" : "bg-brand-50 text-brand-700")}>{n}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Note */}
      <section>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
          2 · What&apos;s wrong? <span className="font-normal normal-case tracking-normal">(optional, helps the AI)</span>
        </p>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. gap under the skirting"
          aria-label="Note for this photo"
          className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] outline-none placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_NOTES.map((q) => (
            <button
              key={q}
              onClick={() => setNote((n) => (n ? `${n}, ${q.toLowerCase()}` : q))}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-ink-2 hover:bg-sunken"
            >
              + {q}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Photo */}
      <section>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">3 · Add photos</p>
        <button
          onClick={openCamera}
          className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-night bg-blueprint-dark px-6 py-9 text-white shadow-lift transition-transform active:scale-[0.99]"
        >
          <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-brand-500/30 blur-3xl" />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-highlight text-night ring-8 ring-white/10 transition-transform group-hover:scale-105">
            <Camera className="size-9" />
          </span>
          <span className="relative mt-4 text-[17px] font-semibold">Open live camera</span>
          <span className="relative mt-1 text-[12.5px] text-white/55">in {room?.name ?? "this room"} · take several in a row</span>
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} aria-label="Take a photo" />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="secondary" className="h-auto flex-col gap-1 py-2.5 text-[12.5px]" onClick={() => galleryRef.current?.click()}>
            <ImagePlus className="size-5" /> Upload photos
          </Button>
          <Button variant="secondary" className="h-auto flex-col gap-1 py-2.5 text-[12.5px]" onClick={() => cameraRef.current?.click()}>
            <Smartphone className="size-5" /> Camera app
          </Button>
          <Button variant="secondary" className="h-auto flex-col gap-1 py-2.5 text-[12.5px]" onClick={() => setManual({ roomId })}>
            <PencilLine className="size-5" /> No photo
          </Button>
        </div>
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} aria-label="Choose photos from gallery" />
      </section>

      {/* Queue */}
      {queue.length > 0 && (
        <section aria-live="polite">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">This session</p>
            {working && <span className="inline-flex items-center gap-1.5 text-[12px] text-muted"><Loader2 className="size-3.5 animate-spin" /> Working…</span>}
          </div>
          <ul className="space-y-2.5">
            {queue.map((it) => (
              <QueueCard key={it.id} item={it} onRetry={() => retry(it.id)} onRetake={() => { setRoomId(it.roomId); cameraRef.current?.click(); }} onManual={() => setManual({ roomId: it.roomId, photoUrl: it.preview })} onDelete={() => setRemoving(it)} />
            ))}
          </ul>
        </section>
      )}

      {queue.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold"><Sparkles className="size-4 text-brand-600" /> How it works</p>
          <ol className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-ink-2">
            <li>1. Pick the room, then photograph one problem at a time, close up.</li>
            <li>2. Our AI spots the defect and writes it up like a professional inspector.</li>
            <li>3. Check the list, change anything, then send it to your builder in one tap.</li>
          </ol>
        </div>
      )}

      {/* Review CTA */}
      {drafts.length > 0 && (
        <div className="sticky bottom-[84px] z-10">
          <Link
            href="/owner/snags"
            className="flex items-center justify-between gap-3 rounded-2xl bg-brand-600 px-4 py-3.5 text-white shadow-lift transition-colors hover:bg-brand-700"
          >
            <span>
              <span className="block text-[14.5px] font-semibold">Review &amp; send {drafts.length} {drafts.length === 1 ? "snag" : "snags"}</span>
              <span className="block text-[12px] text-white/70">Check what the AI wrote before it goes to your builder</span>
            </span>
            <ArrowRight className="size-5 shrink-0" />
          </Link>
        </div>
      )}

      {liveOpen && room && (
        <LiveCamera
          roomName={room.name}
          note={note.trim() || undefined}
          onCapture={(file) => addFiles([file], true)}
          onClose={() => {
            setLiveOpen(false);
            setNote("");
          }}
          onFallback={() => {
            setLiveOpen(false);
            cameraRef.current?.click();
          }}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        icon={<Trash2 className="size-5 text-red-600" />}
        title={removing && unsentCount(removing) ? `Delete ${unsentCount(removing) === 1 ? "this snag" : `these ${unsentCount(removing)} snags`}?` : "Remove this photo?"}
        description={
          removing && unsentCount(removing)
            ? "It hasn't been sent to your builder yet. The photo and what the AI wrote will be removed."
            : "It will be removed from this list."
        }
        confirmLabel="Delete"
        confirmIcon={<Trash2 className="size-4" />}
        onConfirm={() => removing && removeItem(removing)}
        onCancel={() => setRemoving(null)}
      />

      {manual && <ManualSnagModal propertyId={property.id} roomId={manual.roomId} photoUrl={manual.photoUrl} onClose={() => setManual(null)} />}
    </div>
  );
}

function QueueCard({ item, onRetry, onRetake, onManual, onDelete }: { item: QueueItem; onRetry: () => void; onRetake: () => void; onManual: () => void; onDelete: () => void }) {
  const a = item.analysis;
  const badQuality = a && a.image_quality !== "good";
  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex gap-3 p-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.preview && <img src={item.preview} alt="" className="size-full object-cover" />}
          {(item.phase === "compressing" || item.phase === "analysing" || item.phase === "waiting") && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/35">
              {item.phase === "waiting" ? <CloudOff className="size-5 text-white" /> : <Loader2 className="size-5 animate-spin text-white" />}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate text-[12px] text-muted">{item.roomName}{item.note ? ` · “${item.note}”` : ""}</p>
            {(item.phase === "done" || item.phase === "error") && (
              <button
                onClick={onDelete}
                aria-label="Delete this photo and its snags"
                title="Delete"
                className="-mt-1 -mr-1 shrink-0 rounded-lg p-1.5 text-faint transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>

          {item.phase === "waiting" && <p className="mt-0.5 text-[13.5px] font-medium">Waiting for signal…</p>}
          {item.phase === "compressing" && <p className="mt-0.5 text-[13.5px] font-medium">Preparing photo…</p>}
          {item.phase === "analysing" && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] font-medium">
              <Sparkles className="size-4 animate-pulse text-brand-600" /> AI is looking for defects…
            </p>
          )}
          {item.phase === "error" && <p className="mt-0.5 text-[13px] font-medium text-red-700">{item.error}</p>}

          {item.phase === "done" && a && (
            <>
              {a.snags.length > 0 ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-800">
                  <CheckCircle2 className="size-4" /> Found {a.snags.length} {a.snags.length === 1 ? "snag" : "snags"}
                </p>
              ) : (
                <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] font-semibold"><SearchX className="size-4 text-muted" /> No defect spotted</p>
              )}
              <ul className="mt-1.5 space-y-1">
                {a.snags.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px]">
                    <SeverityBadge severity={s.severity} />
                    <span className="truncate">{s.title}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-faint">{item.source === "claude" ? "Analysed by Claude" : "Demo AI (no API key set)"}</p>
            </>
          )}
        </div>
      </div>

      {(badQuality || item.phase === "error" || (item.phase === "done" && a && a.snags.length === 0)) && (
        <div className={cn("flex flex-wrap items-center gap-2 border-t px-3 py-2.5", badQuality ? "border-amber-200 bg-amber-50" : "border-line bg-canvas")}>
          {badQuality && (
            <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] text-amber-900">
              <AlertTriangle className="size-4 shrink-0" /> {QUALITY_TEXT[a!.image_quality]} A clearer photo helps.
            </p>
          )}
          {!badQuality && item.phase === "done" && <p className="min-w-0 flex-1 text-[12.5px] text-muted">Is something wrong here?</p>}
          {item.phase === "error" ? (
            <Button size="sm" variant="secondary" onClick={onRetry}><RotateCcw className="size-3.5" /> Try again</Button>
          ) : (
            <>
              {badQuality && <Button size="sm" variant="secondary" onClick={onRetake}><Camera className="size-3.5" /> Retake</Button>}
              <Button size="sm" variant="secondary" onClick={onManual}><PencilLine className="size-3.5" /> Add by hand</Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
