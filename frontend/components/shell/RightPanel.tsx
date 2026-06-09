import Link from "next/link";

export function RightPanel() {
  return (
    <aside className="w-[310px] flex flex-col gap-6 py-6 px-4">
      {/* Search bar */}
      <Link
        href="/search"
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg2)] text-[var(--text2)] text-sm hover:bg-[var(--bg3)] transition-colors"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
        </svg>
        Search
      </Link>

      {/* Trending widget */}
      <section>
        <h3 className="font-semibold text-[var(--text)] mb-3 text-[15px]">Trending</h3>
        <div className="space-y-3">
          {["#design", "#typescript", "#nextjs", "#threads", "#ai"].map((tag, i) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="flex items-start justify-between group"
            >
              <div>
                <span className="text-xs text-[var(--text2)]">{i + 1} · Trending</span>
                <p className="text-sm font-semibold text-[var(--text)] group-hover:underline">{tag}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Suggested users widget */}
      <section>
        <h3 className="font-semibold text-[var(--text)] mb-3 text-[15px]">Suggested for you</h3>
        <p className="text-sm text-[var(--text2)]">Follow people to see their threads here.</p>
        <Link href="/search" className="text-sm text-[var(--accent)] mt-2 inline-block font-medium hover:underline">
          Find people
        </Link>
      </section>
    </aside>
  );
}
