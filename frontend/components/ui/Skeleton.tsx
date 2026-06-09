import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** A single shimmer rectangle. Compose multiples to build skeleton screens. */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-md", className)}
      style={{
        background: "var(--skeleton)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/** Full PostCard skeleton — avatar + two text lines + action row */
export function PostCardSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-[var(--border)] flex gap-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-5 mt-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-8 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
