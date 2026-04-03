// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center relative">
      <div className="dot-grid absolute inset-0 opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold glow-blue">V</div>
            <span className="font-bold text-xl tracking-tight">ChunkR</span>
          </div>
          <p className="text-sm text-zinc-500">Create your storage vault</p>
        </div>

        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: "#0d1220",
              colorInputBackground: "#111827",
              colorInputText: "#e2e8f0",
              colorText: "#e2e8f0",
              colorTextSecondary: "#94a3b8",
              colorNeutral: "#1e2d45",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-syne), system-ui, sans-serif",
            },
            elements: {
              card: "bg-[#0d1220] border border-[#1e2d45] shadow-2xl",
              headerTitle: "font-bold text-zinc-100",
              headerSubtitle: "text-zinc-500",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-500 transition-colors",
              formFieldInput: "bg-[#111827] border-[#1e2d45] text-zinc-100 focus:border-blue-500",
              footerActionLink: "text-blue-400 hover:text-blue-300",
              dividerLine: "bg-[#1e2d45]",
              socialButtonsBlockButton: "bg-[#111827] border-[#1e2d45] text-zinc-300 hover:bg-[#1a2235]",
            },
          }}
        />
      </div>
    </div>
  );
}