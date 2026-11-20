"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, CameraOff, Check, RefreshCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** True when this browser can show a live camera (needs HTTPS or localhost). */
export const canUseLiveCamera = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

/**
 * Full-screen live camera inside the app.
 * Take as many shots as you like; each one is handed to onCapture straight away so the AI can start on it.
 */
export function LiveCamera({
  roomName,
  note,
  onCapture,
  onClose,
  onFallback,
}: {
  roomName: string;
  note?: string;
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Called when the live camera can't start, so the page can open the phone's camera app instead. */
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [multiCam, setMultiCam] = useState(false);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Start (or restart) the camera whenever the facing direction changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReady(false);
      setError(null);
      stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setMultiCam(devices.filter((d) => d.kind === "videoinput").length > 1);
          setReady(true);
        }
      } catch (e) {
        if (cancelled) return;
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera access was blocked. Allow the camera for this site, or use your phone's camera app instead."
            : name === "NotFoundError"
              ? "No camera was found on this device."
              : "The camera couldn't start.",
        );
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing]);

  // Close on Escape, lock page scroll while open
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const shoot = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      // Front camera preview is mirrored; save the photo the right way round
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `snag-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        setShots((s) => [URL.createObjectURL(blob), ...s].slice(0, 8));
      },
      "image/jpeg",
      0.92,
    );
  }, [facing, onCapture]);

  // Free the thumbnail URLs when closing
  useEffect(() => () => shots.forEach((u) => URL.revokeObjectURL(u)), [shots]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Camera">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3">
        <button onClick={onClose} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Close camera">
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[14px] font-semibold">{roomName}</p>
          <p className="truncate text-[12px] text-white/60">{note ? `“${note}”` : "One problem per photo, close up"}</p>
        </div>
        {multiCam ? (
          <button onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Switch camera">
            <RefreshCcw className="size-5" />
          </button>
        ) : (
          <span className="size-9" />
        )}
      </div>

      {/* Viewfinder */}
      <div className="relative mx-auto flex w-full max-w-[720px] flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="max-w-xs px-6 text-center">
            <CameraOff className="mx-auto size-10 text-white/50" />
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">{error}</p>
            <button onClick={onFallback} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-highlight px-4 text-[14px] font-semibold text-night">
              <Camera className="size-4" /> Use phone camera app
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn("h-full w-full object-cover", facing === "user" && "-scale-x-100", !ready && "opacity-0")}
            />
            {/* Rule-of-thirds grid + framing hint */}
            {ready && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
                <div className="absolute inset-[18%] rounded-2xl border-2 border-dashed border-white/40" />
                <p className="absolute inset-x-0 bottom-4 text-center text-[12px] text-white/70">Fill the box with the problem</p>
              </div>
            )}
            {!ready && <p className="absolute text-[13px] text-white/60">Starting camera…</p>}
            {flash && <div className="absolute inset-0 bg-white/70" />}
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-[max(env(safe-area-inset-bottom),20px)]">
        <div className="flex w-20 items-center">
          {shots[0] ? (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shots[0]} alt="Last photo" className="size-14 rounded-xl border-2 border-white/80 object-cover" />
              <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-highlight text-[11px] font-bold text-night">{shots.length}</span>
            </span>
          ) : (
            <span className="text-[11px] text-white/40">No photos yet</span>
          )}
        </div>
        <button
          onClick={shoot}
          disabled={!ready}
          aria-label="Take photo"
          className="flex size-[78px] items-center justify-center rounded-full border-4 border-white/90 transition-transform active:scale-90 disabled:opacity-40"
        >
          <span className="size-[62px] rounded-full bg-white" />
        </button>
        <div className="flex w-20 justify-end">
          <button onClick={onClose} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-highlight px-3.5 text-[14px] font-semibold text-night">
            <Check className="size-4" /> Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
