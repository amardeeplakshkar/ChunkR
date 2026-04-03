// app/(dashboard)/layout.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { FolderTree } from "@/components/FolderTree";

const NAV = [
  { href: "/dashboard",         label: "Files",    icon: "📁" },
  { href: "/dashboard/storage", label: "Storage",  icon: "📊" },
  { href: "/dashboard/shared",  label: "Shared",   icon: "🔗" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pass folder selection down via a context or URL — here we use a simple event
  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-[#1e2d45] bg-[#080c14]/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-[#111827] text-zinc-400"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">V</div>
            <span className="font-bold tracking-tight hidden sm:block">ChunkR</span>
          </Link>
        </div>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? "bg-blue-600/15 text-blue-400"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-[#111827]"
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs font-mono text-zinc-600 border border-[#1e2d45] px-2 py-1 rounded-md">
            SELF-HOSTED
          </span>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
                userButtonPopoverCard: "bg-[#0d1220] border border-[#1e2d45]",
                userButtonPopoverActionButton: "hover:bg-[#111827] text-zinc-300",
                userButtonPopoverActionButtonText: "text-zinc-300",
              },
            }}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-20 w-56 bg-[#080c14] border-r border-[#1e2d45]
            flex flex-col pt-14 md:pt-0 transform transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          `}
        >
          {/* Mobile nav */}
          <div className="md:hidden px-2 py-3 border-b border-[#1e2d45]">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active ? "bg-blue-600/15 text-blue-400" : "text-zinc-400 hover:text-zinc-100 hover:bg-[#111827]"}`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Folder tree */}
          <div className="flex-1 overflow-y-auto py-3 px-2">
            <p className="text-xs uppercase tracking-widest text-zinc-600 font-mono px-2 mb-2">
              Folders
            </p>
            <FolderTree
              selectedId={selectedFolder}
              onSelect={(id) => {
                setSelectedFolder(id);
                setSidebarOpen(false);
              }}
            />
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Inject selectedFolder via a data attribute for child pages */}
          <div data-folder-id={selectedFolder ?? ""} className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}