import { redirect } from "next/navigation";
import { QrCode } from "lucide-react";

export default function HomePage({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  // Some NFC tags/QR codes may be programmed to point at "/" instead of
  // "/menu" directly — forward the table param through if it's present.
  if (searchParams.table) {
    redirect(`/menu?table=${encodeURIComponent(searchParams.table)}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-900 px-6 text-center text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
        <QrCode className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-semibold">Scan the tag on your table</h1>
      <p className="max-w-xs text-sm text-white/60">
        Tap your phone against the NFC tag at your table to open the menu and
        start ordering.
      </p>
    </main>
  );
}
