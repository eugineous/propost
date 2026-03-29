import type { PostMetrics, PerformanceTier } from '@/lib/types'

/**
 * Calculate performance score for a post.
 * Formula mirrors the Postgres computed column exactly:
 * Score = (impressions × 0.1) + (likes × 2) + (reposts × 5) + (replies × 3) + (newFollowers × 20)
 */
export function calculatePerformanceScore(metrics: PostMetrics): number {
  return (
    metrics.impressions * 0.1 +
    metrics.likes * 2 +
    metrics.reposts * 5 +
    metrics.replies * 3 +
    metrics.newFollowers * 20
  )
}

/**
 * Classify a performance score into a tier.
 * VIRAL: > 500
 * GOOD:  100–500 (inclusive)
 * WEAK:  < 100
 */
export function classifyPerformance(score: number): PerformanceTier {
  if (score > 500) return 'VIRAL'
  if (score >= 100) return 'GOOD'
  return 'WEAK'
}
