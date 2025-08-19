/**
 * Metrics utility functions
 */

import type { Cluster } from './types'

/**
 * Calculate negative intensity for a cluster
 * @param cluster - Cluster object
 * @returns Value between 0 and 1
 */
export function negIntensity(cluster: Cluster): number {
  return Math.max(0, -cluster.sentiment)
}

/**
 * Format percentage value
 * @param value - Decimal value (e.g., 0.234)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPct(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format number with K suffix for thousands
 * @param value - Number to format
 * @returns Formatted string
 */
export function formatK(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * Calculate priority score for a cluster
 * Higher score = higher priority to address
 * @param cluster - Cluster object
 * @returns Priority score between 0 and 1
 */
export function calculatePriority(cluster: Cluster): number {
  const negativeImpact = negIntensity(cluster)
  const volumeImpact = cluster.share
  
  // Weighted combination
  const score = (negativeImpact * 0.6) + (volumeImpact * 0.4)
  
  // Boost if both high negative and high volume
  if (negativeImpact > 0.5 && volumeImpact > 0.15) {
    return Math.min(1, score * 1.2)
  }
  
  return score
}

/**
 * Categorize cluster by opportunity quadrant
 * @param cluster - Cluster object
 * @returns Quadrant name
 */
export function getOpportunityQuadrant(cluster: Cluster): string {
  const negative = negIntensity(cluster)
  const share = cluster.share
  
  if (share >= 0.5) {
    if (negative >= 0.5) {
      return 'Must Fix'      // High impact, high negativity
    } else {
      return 'Quick Wins'     // High impact, low negativity
    }
  } else {
    if (negative >= 0.5) {
      return 'Strategic'      // Low impact, high negativity
    } else {
      return 'Monitor'        // Low impact, low negativity
    }
  }
}

/**
 * Format trend data for visualization
 * @param trend - Array of trend points
 * @returns Formatted trend data
 */
export function formatTrend(trend: Array<{ week: string; count: number }>): Array<{ label: string; value: number }> {
  return trend.map(point => ({
    label: point.week,
    value: point.count
  }))
}

/**
 * Calculate trend direction
 * @param trend - Array of trend points
 * @returns 'up' | 'down' | 'stable'
 */
export function getTrendDirection(trend: Array<{ week: string; count: number }>): 'up' | 'down' | 'stable' {
  if (trend.length < 2) return 'stable'
  
  const recent = trend.slice(-3)
  const older = trend.slice(-6, -3)
  
  if (recent.length === 0 || older.length === 0) return 'stable'
  
  const recentAvg = recent.reduce((sum, p) => sum + p.count, 0) / recent.length
  const olderAvg = older.reduce((sum, p) => sum + p.count, 0) / older.length
  
  const change = (recentAvg - olderAvg) / olderAvg
  
  if (change > 0.1) return 'up'
  if (change < -0.1) return 'down'
  return 'stable'
}

/**
 * Calculate average rating from rating histogram
 * @param ratingHist - Array of [rating, count] tuples
 * @returns Average rating
 */
export function calculateAverageRating(ratingHist: Array<[number, number]>): number {
  let totalRatings = 0
  let totalCount = 0
  
  for (const [rating, count] of ratingHist) {
    totalRatings += rating * count
    totalCount += count
  }
  
  return totalCount > 0 ? totalRatings / totalCount : 0
}

/**
 * Get rating distribution percentages
 * @param ratingHist - Array of [rating, count] tuples
 * @returns Object with percentage for each rating
 */
export function getRatingDistribution(ratingHist: Array<[number, number]>): Record<number, number> {
  const total = ratingHist.reduce((sum, [_, count]) => sum + count, 0)
  const distribution: Record<number, number> = {}
  
  for (const [rating, count] of ratingHist) {
    distribution[rating] = total > 0 ? (count / total) * 100 : 0
  }
  
  return distribution
}

/**
 * Format duration for display
 * @param start - Start date string
 * @param end - End date string
 * @returns Formatted duration string
 */
export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    year: 'numeric' 
  }
  
  return `${startDate.toLocaleDateString('it-IT', options)} - ${endDate.toLocaleDateString('it-IT', options)}`
}