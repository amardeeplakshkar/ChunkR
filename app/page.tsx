// app/page.tsx
import { Show } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#080c14] relative overflow-hidden">
      {/* Dot grid */}
      <div className="dot-grid absolute inset-0 opacity-60" />

      {/* Radial glow center */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-blue-500/8 blur-[60px] pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-[#1e2d45]/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold glow-blue">
              V
            </div>
            <span className="font-bold text-lg tracking-tight">ChunkR</span>
          </div>
          <div className="flex items-center gap-3">
            <Show when={"signed-in"}>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-colors"
              >
                Open Dashboard →
              </Link>
            </Show>
            <Show when={"signed-out"}>
              <Link
                href="/sign-in"
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-100 text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-colors"
              >
                Get started
              </Link>
            </Show>
          </div>
        </nav>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 stagger">
          {/* Badge */}
          <div className="animate-fade-up opacity-0 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-ring" />
            Self-hosted · Telegram-powered · Unlimited storage
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up opacity-0 text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-4xl mb-6">
            Your files.
            <br />
            <span className="text-blue-400 text-glow">Your infrastructure.</span>
          </h1>

          <p className="animate-fade-up opacity-0 text-zinc-400 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
            A private cloud storage platform that uses Telegram as its backend.
            No subscriptions. No limits. Completely yours.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up opacity-0 flex flex-col sm:flex-row gap-3">
            <Show when={"signed-out"}>
              <Link
                href="/sign-up"
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-base transition-all hover:scale-[1.02] glow-blue"
              >
                Start for free →
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                className="px-8 py-3.5 rounded-xl border border-[#1e2d45] hover:border-[#2a3f5f] text-zinc-300 hover:text-zinc-100 font-semibold text-base transition-all"
              >
                View on GitHub
              </Link>
            </Show>
            <Show when={"signed-in"}>
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-base transition-all hover:scale-[1.02] glow-blue"
              >
                Open Dashboard →
              </Link>
            </Show>
          </div>
        </main>

        {/* Feature grid */}
        <section className="px-6 md:px-12 pb-24 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#1e2d45]/60 px-6 py-5 text-center text-xs text-zinc-700 font-mono">
          ChunkR · SELF-HOSTED · OPEN SOURCE
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="animate-fade-up opacity-0 group rounded-xl border border-[#1e2d45] hover:border-[#2a3f5f] bg-[#0d1220]/60 p-5 space-y-3 transition-all hover:bg-[#111827]/60">
      <div className="text-2xl">{icon}</div>
      <h3 className="font-semibold text-zinc-200">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}

const FEATURES = [
  {
    icon: "☁️",
    title: "Telegram Storage",
    desc: "Files are stored directly in a private Telegram channel. Free, fast, and with no storage cap.",
  },
  {
    icon: "🔒",
    title: "Private by Default",
    desc: "Files are only accessible through your authenticated account. Share only what you choose.",
  },
  {
    icon: "📦",
    title: "Multipart Uploads",
    desc: "Large files are automatically split into 45 MB chunks and reassembled on download.",
  },
  {
    icon: "🔗",
    title: "Shareable Links",
    desc: "Generate time-limited or use-limited public links for any file. Revoke anytime.",
  },
  {
    icon: "👁️",
    title: "File Preview",
    desc: "Preview images, videos, PDFs, and audio directly in the browser without downloading.",
  },
  {
    icon: "📊",
    title: "Storage Analytics",
    desc: "Track your usage by file type, see recent uploads, and monitor your storage at a glance.",
  },
];