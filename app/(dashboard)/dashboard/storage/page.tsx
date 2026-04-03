// app/(dashboard)/dashboard/storage/page.tsx
import { StorageDashboard } from "@/components/StorageDashboard";

export default function StoragePage() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Storage</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Analytics and usage breakdown for your vault
        </p>
      </div>
      <StorageDashboard />
    </div>
  );
}