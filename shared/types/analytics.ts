// ─────────────────────────────────────────────
// Insights & Analytics types
// ─────────────────────────────────────────────

export type AnalyticsRange = "7d" | "30d" | "90d";

/** A single data point in a time-series chart */
export interface ChartPoint {
  date: string;     // "YYYY-MM-DD"
  value: number;
}

/** Top-level summary counters for the insights dashboard */
export interface InsightsSummary {
  totalViews: number;
  viewsDelta: number;         // Δ vs previous period (positive = up)
  totalLikes: number;
  likesDelta: number;
  totalReplies: number;
  repliesDelta: number;
  totalReposts: number;
  repostsDelta: number;
  followerCount: number;
  followerDelta: number;
}

/** Performance chart data for a given range */
export interface PerformanceChart {
  range: AnalyticsRange;
  views: ChartPoint[];
  likes: ChartPoint[];
  replies: ChartPoint[];
  reposts: ChartPoint[];
}

/** Where the content was discovered */
export interface DiscoverySource {
  source: string;   // "Threads" | "Instagram" | "Facebook" | "Search" | "Other"
  percentage: number;
  count: number;
}

/** Geographic breakdown */
export interface GeoBreakdown {
  country: string;
  city: string | null;
  percentage: number;
  followerCount: number;
}

/** Demographic breakdown */
export interface DemographicBreakdown {
  ageRange: string;       // "18-24" | "25-34" | etc.
  gender: string;         // "Male" | "Female" | "Other"
  percentage: number;
}

/** Weekly recap card shown on insights home */
export interface WeeklyRecap {
  weekOf: string;          // ISO 8601 start of week
  posts: number;
  postsDelta: number;
  views: number;
  viewsDelta: number;
  followers: number;
  followersDelta: number;
  replies: number;
  repliesDelta: number;
}

/** Per-post analytics (link clicks, impressions, etc.) */
export interface ThreadInsight {
  threadId: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  linkClicks: number;
  impressions: number;
  engagementRate: number;   // percentage
}
