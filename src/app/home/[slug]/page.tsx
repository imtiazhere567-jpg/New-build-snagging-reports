"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { useHydrated } from "@/lib/data/use-hydrated";
import { ownerSlug } from "@/lib/data/queries";
import { LogoMark } from "@/components/ui/logo";
import { isLive } from "@/lib/config";

/**
 * A home owner's own app link, e.g. /home/morgan.
 * Signs that owner in for this window only, so the contractor dashboard can stay open in another window.
 */
export default function OwnerHomeLinkPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OwnerHomeLink />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LogoMark className="size-10 animate-pulse" />
    </div>
  );
}

function OwnerHomeLink() {
  const { slug } = useParams<{ slug: string }>();
  const ready = useHydrated();
  const router = useRouter();
  const owner = useStore((s) => s.users.find((u) => u.role === "owner" && ownerSlug(s, u.id) === slug?.toLowerCase()));
  const signIn = useStore((s) => s.signIn);

  useEffect(() => {
    // On the live site sign-in is by email, so this demo shortcut just goes to the owner app entry
    if (isLive) {
      router.replace("/phone");
      return;
    }
    if (!ready || !owner) return;
    signIn(owner.id);
    router.replace("/owner");
  }, [ready, owner, signIn, router]);

  if (ready && !owner) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <LogoMark className="size-10" />
        <p className="text-[15px] font-semibold">This home link doesn&apos;t exist</p>
        <p className="text-[13px] text-muted">Check the link from your builder&apos;s email.</p>
        <Link href="/login" className="mt-2 text-[13.5px] font-semibold text-brand-700 underline">Go to sign in</Link>
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LogoMark className="size-10 animate-pulse" />
    </div>
  );
}
