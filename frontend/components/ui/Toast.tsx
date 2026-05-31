"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, CloseIcon } from "./Icons";

export type ToastType = "success" | "error" | "info";

export interface ToastData {
  id: string;
  message: string;
  type?: ToastType;
}

// ── Singleton event bus ────────────────────────────────────────────────────────
const listeners: Array<(t: ToastData) => void> = [];

export function toast(message: string, type: ToastType = "success") {
  const data: ToastData = { id: crypto.randomUUID(), message, type };
  listeners.forEach((cb) => cb(data));
}

// ── Individual toast pill ──────────────────────────────────────────────────────
function ToastPill({ data, onRemove }: { data: ToastData; onRemove: () => void }) {
  useEffect(() => {
    const t = setTimeout(onRemove, 2400);
    return () => clearTimeout(t);
  }, [onRemove]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium",
        "animate-[toastIn_0.25s_ease] pointer-events-auto",
        data.type === "error"
          ? "bg-red-600 text-white"
          : "bg-[var(--toast-bg)] text-[var(--toast-fg)]",
      )}
      role="alert"
    >
      {data.type !== "error" && <CheckIcon size={15} className="flex-shrink-0" />}
      <span>{data.message}</span>
      <button onClick={onRemove} className="ml-1 opacity-60 hover:opacity-100">
        <CloseIcon size={13} />
      </button>
    </div>
  );
}

// ── Host — mount once in root layout ──────────────────────────────────────────
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const cb = (t: ToastData) => setToasts((prev) => [...prev, t]);
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i !== -1) listeners.splice(i, 1);
    };
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <ToastPill key={t.id} data={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  );
}
