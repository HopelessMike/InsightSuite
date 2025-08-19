/**
 * Color utility functions for sentiment visualization
 */

/**
 * Convert sentiment value to color
 * @param sentiment - Value between -1 and 1
 * @returns HSL color string
 */
export function sentimentToColor(sentiment: number): string {
  // Clamp value between -1 and 1
  const value = Math.max(-1, Math.min(1, sentiment))
  
  if (value > 0.3) {
    // Positive - Green
    const intensity = (value - 0.3) / 0.7
    return `hsl(142, ${50 + intensity * 26}%, ${36 + intensity * 10}%)`
  } else if (value < -0.3) {
    // Negative - Red
    const intensity = (Math.abs(value) - 0.3) / 0.7
    return `hsl(0, ${60 + intensity * 24}%, ${50 + intensity * 10}%)`
  } else {
    // Neutral - Gray
    return 'hsl(240, 5%, 64%)'
  }
}

/**
 * Convert sentiment value to text label
 * @param sentiment - Value between -1 and 1
 * @returns Label string
 */
export function sentimentToLabel(sentiment: number): string {
  if (sentiment > 0.6) return 'Molto Positivo'
  if (sentiment > 0.3) return 'Positivo'
  if (sentiment > -0.3) return 'Neutro'
  if (sentiment > -0.6) return 'Negativo'
  return 'Molto Negativo'
}

/**
 * Convert sentiment to emoji
 * @param sentiment - Value between -1 and 1
 * @returns Emoji string
 */
export function sentimentToEmoji(sentiment: number): string {
  if (sentiment > 0.6) return '😊'
  if (sentiment > 0.3) return '🙂'
  if (sentiment > -0.3) return '😐'
  if (sentiment > -0.6) return '😕'
  return '😞'
}

/**
 * Get sentiment badge variant for shadcn/ui Badge component
 * @param sentiment - Value between -1 and 1
 * @returns Badge variant
 */
export function sentimentToBadgeVariant(sentiment: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (sentiment > 0.3) return 'default'
  if (sentiment < -0.3) return 'destructive'
  return 'secondary'
}

/**
 * Generate diverging color scale for data visualization
 * @param steps - Number of color steps
 * @returns Array of HSL color strings
 */
export function getDivergingColorScale(steps: number = 5): string[] {
  const colors: string[] = []
  const half = Math.floor(steps / 2)
  
  // Red side (negative)
  for (let i = 0; i < half; i++) {
    const intensity = (i + 1) / half
    colors.push(`hsl(0, ${84 - intensity * 20}%, ${60 - intensity * 15}%)`)
  }
  
  // Neutral (if odd number of steps)
  if (steps % 2 === 1) {
    colors.push('hsl(240, 5%, 64%)')
  }
  
  // Green side (positive)
  for (let i = half - 1; i >= 0; i--) {
    const intensity = (i + 1) / half
    colors.push(`hsl(142, ${76 - intensity * 20}%, ${36 + intensity * 10}%)`)
  }
  
  return colors
}

/**
 * Get color for opportunity score
 * @param score - Value between 0 and 1
 * @returns HSL color string
 */
export function opportunityScoreToColor(score: number): string {
  if (score > 0.8) return 'hsl(0, 84%, 60%)'      // High priority - Red
  if (score > 0.6) return 'hsl(25, 95%, 53%)'     // Orange
  if (score > 0.4) return 'hsl(45, 93%, 47%)'     // Yellow
  if (score > 0.2) return 'hsl(197, 71%, 73%)'    // Light Blue
  return 'hsl(142, 76%, 36%)'                      // Low priority - Green
}