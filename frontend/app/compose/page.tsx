"use client";
import { useRouter } from "next/navigation";
import { Composer } from "@/components/thread/Composer";
import { BackIcon } from "@/components/ui/Icons";

export default function ComposePage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[622px] mx-auto">
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
          <button onClick={() => router.back()} className="p-1 text-[var(--text2)]">
            <BackIcon size={20} />
          </button>
          <h1 className="font-semibold text-[var(--text)]">New thread</h1>
          <div className="w-8" />
        </div>
        <Composer autoFocus onSuccess={() => router.push("/")} />
      </div>
    </div>
  );
}
