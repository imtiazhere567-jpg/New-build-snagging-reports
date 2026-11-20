// The demo store lives in the browser, so the owner link resolves client-side.
export const instant = false;

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
