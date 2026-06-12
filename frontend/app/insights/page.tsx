"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { fmtN, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Range = "7d" | "30d" | "90d";

interface Summary {
  period: string;
  threadCount: number;
  followerCount: number;
  current: {
    likeCount: number;
    replyCount: number;
    repostCount: number;
    quoteCount: number;
    viewCount: number;
  };
  previous: {
    likeCount: number;
    replyCount: number;
    repostCount: number;
    quoteCount: number;
    viewCount: number;
  };
  changes: {
    likes: number;
    replies: number;
    reposts: number;
    views: number;
  };
}

interface ChartPoint {
  date: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
}

function Delta({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span className={cn("text-xs font-medium", pos ? "text-green-500" : "text-red-500")}>
      {pos ? "+" : ""}{value}%
    </span>
  );
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta?: number;
}) {
  return (
    <div className="p-4 rounded-xl bg-secondary space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{fmtN(value)}</p>
      {delta !== undefined && <Delta value={delta} />}
    </div>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [range, setRange] = useState<Range>("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push("/login"); return; }
    setLoading(true);
    Promise.all([
      api.get<Summary>("/insights"),
      api.get<ChartPoint[]>(`/insights/chart?range=${range}`),
    ])
      .then(([s, c]) => {
        setSummary(s);
        setChart(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, hasHydrated, range, router]);

  if (!hasHydrated) return <div className="flex min-h-screen bg-background" />;

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
              <h2 className="font-semibold text-foreground mb-3">
                Overview · last {summary.period}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Views"     value={summary.current.viewCount}   delta={summary.changes.views}   />
                <StatCard label="Likes"     value={summary.current.likeCount}   delta={summary.changes.likes}   />
                <StatCard label="Replies"   value={summary.current.replyCount}  delta={summary.changes.replies} />
                <StatCard label="Reposts"   value={summary.current.repostCount} delta={summary.changes.reposts} />
                <StatCard label="Followers" value={summary.followerCount} />
                <StatCard label="Threads"   value={summary.threadCount} />
              </div>
            </section>

            {/* Range selector + bar chart */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Performance</h2>
                <div className="flex gap-1">
                  {(["7d", "30d", "90d"] as Range[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        range === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-foreground/10",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {chart.length > 0 && (
                <div className="bg-secondary rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-3">Views over time</p>
                  <div className="flex items-end gap-1 h-32">
                    {chart.map((p) => {
                      const maxVal = Math.max(...chart.map((v) => v.views), 1);
                      const heightPct = (p.views / maxVal) * 100;
                      return (
                        <div
                          key={p.date}
                          title={`${p.date}: ${fmtN(p.views)} views`}
                          className="flex-1 flex flex-col items-center"
                        >
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
        ) : (
          <div className="p-6 text-center text-muted-foreground text-sm">No data yet — start posting!</div>
        )}
      </main>

      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
