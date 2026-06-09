"use client";
// The compose sheet is now a global overlay (ComposeSheet in app/layout.tsx).
// This page exists only so any deep link or old bookmark to /compose still works:
// it opens the overlay, then replaces the URL back to home.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useComposeStore } from "@/stores/compose";

export default function ComposePage() {
  const router = useRouter();
  const openCompose = useComposeStore((s) => s.open);

  useEffect(() => {
    openCompose();
    router.replace("/");
  }, [openCompose, router]);

  return null;
}
