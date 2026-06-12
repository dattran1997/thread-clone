"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { fmtN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Range = "7d" | "30d" | "90d";

interface Summary {
  totalViews: number; viewsDelta: number;
  totalLikes: number; likesDelta: number;
  totalReplies: number; repliesDelta: number;
  totalReposts: number; repostsDelta: number;
  followerCount: number; followerDelta: number;
}

interface ChartPoint { date: string; value: number; }
interface Chart { range: Range; views: ChartPoint[]; likes: ChartPoint[]; replies: ChartPoint[]; reposts: ChartPoint[]; }

function Delta({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span className={cn("text-xs font-medium", pos ? "text-green-500" : "text-red-500")}>
      {pos ? "+" : ""}{fmtN(value)}
    </span>
  );
}

function StatCard({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div className="p-4 rounded-xl bg-secondary space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{fmtN(value)}</p>
      <Delta value={delta} />
    </div>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [range, setRange] = useState<Range>("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    setLoading(true);
    Promise.all([
      api.get<Summary>("/insights"),
      api.get<Chart>(`/insights/chart?range=${range}`),
    ]).then(([s, c]) => { setSummary(s); setChart(c); })
      .finally(() => setLoading(false));
  }, [user, range, router]);

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        <div className="sticky top-0 z-20 px-4 py-3 border-b border-border bg-background/90 backdrop-blur-xl">
          <h1 className="text-xl font-bold text-foreground">Insights</h1>
        </div>

        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading insights…</div>
        ) : summary ? (
          <div className="p-4 space-y-6">
            {/* Summary cards */}
            <section>
              <h2 className="font-semibold text-foreground mb-3">Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Views" value={summary.totalViews} delta={summary.viewsDelta} />
                <StatCard label="Likes" value={summary.totalLikes} delta={summary.likesDelta} />
                <StatCard label="Replies" value={summary.totalReplies} delta={summary.repliesDelta} />
                <StatCard label="Reposts" value={summary.totalReposts} delta={summary.repostsDelta} />
                <StatCard label="Followers" value={summary.followerCount} delta={summary.followerDelta} />
              </div>
            </section>

            {/* Range selector */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Performance</h2>
                <div className="flex gap-1">
                  {(["7d", "30d", "90d"] as Range[]).map((r) => (
                    <button key={r} onClick={() => setRange(r)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        range === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-foreground/10",
                      )}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simple bar chart for views */}
              {chart && (
                <div className="bg-secondary rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-3">Views over time</p>
                  <div className="flex items-end gap-1 h-32">
                    {chart.views.map((p) => {
                      const maxVal = Math.max(...chart.views.map((v) => v.value), 1);
                      const heightPct = (p.value / maxVal) * 100;
                      return (
                        <div key={p.date} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-primary opacity-80 min-h-[2px]"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>

      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
