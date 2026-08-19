import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restaurant Dashboard",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f4f4f5]">{children}</div>;
}
