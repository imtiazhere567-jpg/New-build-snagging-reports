import { TeamFrame } from "@/components/shell/frames";

// The demo store lives in the browser, so these screens render client-side after sign-in.
export const instant = false;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TeamFrame>{children}</TeamFrame>;
}
