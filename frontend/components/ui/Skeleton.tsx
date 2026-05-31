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
    <div className="p-4 border-b border-[var(--border)] flex gap-3">
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex gap-4 mt-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-5 w-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
