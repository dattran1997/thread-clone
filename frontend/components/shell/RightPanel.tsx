import Link from "next/link";
import { Search } from "lucide-react";

const TRENDING = [
  { tag: "design", count: "12.4K" },
  { tag: "typescript", count: "8.1K" },
  { tag: "nextjs", count: "6.9K" },
  { tag: "threads", count: "5.2K" },
  { tag: "ai", count: "3.8K" },
];

export function RightPanel() {
  return (
    <aside className="w-[310px] flex flex-col gap-6 py-6 px-6 sticky top-0 h-screen overflow-y-auto">
      {/* Search bar */}
      <Link
        href="/search"
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--bg2)] text-[var(--text2)] text-[15px] hover:bg-[var(--bg3)] transition-colors"
      >
        <Search size={18} className="flex-shrink-0" />
        <span>Search</span>
      </Link>

      {/* Trending widget */}
      <section>
        <h3 className="text-[15px] text-[var(--text)] mb-4">Trending</h3>
        <div className="flex flex-col gap-4">
          {TRENDING.map((item, i) => (
            <Link
              key={item.tag}
              href={`/search?q=${encodeURIComponent("#" + item.tag)}`}
              className="flex flex-col hover:opacity-80 transition-opacity"
            >
              <span className="text-[13px] text-[var(--text2)]">{i + 1} · Trending</span>
              <span className="text-[15px] text-[var(--text)] font-medium">#{item.tag}</span>
              <span className="text-[13px] text-[var(--text2)]">{item.count} threads</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Suggested users widget */}
      <section>
        <h3 className="text-[15px] text-[var(--text)] mb-4">Suggested for you</h3>
        <p className="text-[14px] text-[var(--text2)]">Follow people to see their threads here.</p>
        <Link
          href="/search"
          className="text-[14px] text-[var(--text)] font-medium mt-2 inline-block hover:underline"
        >
          Find people →
        </Link>
      </section>
    </aside>
  );
}
