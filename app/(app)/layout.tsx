import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { requireSession } from "@/lib/auth";

// Every signed-in screen renders inside this layout, so this one check gates
// them all. It replaces the old middleware, which couldn't be used once the
// data moved into a local SQLite file — middleware has no filesystem.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-5 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
