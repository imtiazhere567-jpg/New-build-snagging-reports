"use client";

import { Camera, CheckCheck, House, ListChecks, MessagesSquare, PoundSterling, Wrench } from "lucide-react";
import { RoleGate } from "./role-gate";
import { ContractorShell } from "./contractor-shell";
import { MobileShell, type TabItem } from "./mobile-shell";

const OWNER_TABS: TabItem[] = [
  { href: "/owner", label: "Home", icon: House, exact: true },
  { href: "/owner/snags", label: "Snags", icon: ListChecks },
  { href: "/owner/capture", label: "Capture", icon: Camera, primary: true },
  { href: "/owner/billing", label: "Quote", icon: PoundSterling },
  { href: "/owner/updates", label: "Updates", icon: MessagesSquare },
];

const TEAM_TABS: TabItem[] = [
  { href: "/team", label: "My jobs", icon: Wrench, exact: true },
  { href: "/team/completed", label: "Completed", icon: CheckCheck },
];

export function ContractorFrame({ children }: { children: React.ReactNode }) {
  return <RoleGate role="contractor">{(user) => <ContractorShell user={user}>{children}</ContractorShell>}</RoleGate>;
}

export function OwnerFrame({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="owner">
      {(user) => (
        <MobileShell user={user} tabs={OWNER_TABS}>
          {children}
        </MobileShell>
      )}
    </RoleGate>
  );
}

export function TeamFrame({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="team">
      {(user) => (
        <MobileShell user={user} tabs={TEAM_TABS}>
          {children}
        </MobileShell>
      )}
    </RoleGate>
  );
}
