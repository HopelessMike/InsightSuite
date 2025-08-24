export type Quote = {
  id: string
  text: string
  rating?: number
  lang: string
}

export type Cluster = {
  id: string
  label: string
  size: number
  share: number
  sentiment: number
  trend: { week: string; count: number }[]
  keywords: string[]
  summary: string
  strengths: string[]
  weaknesses: string[]
  opportunity_score: number
  quotes: Quote[]
  co_occurs: string[]
}

export type Persona = {
  id: string
  name: string
  share: number
  goals: string[]
  pains: string[]
  clusters: string[]
  quotes: string[]
  channels: string[]
}

export type TimeseriesPoint = {
  date: string
  sentiment_mean?: number
  volume?: number
  share?: number
  sentiment?: number
}

export type Timeseries = {
  monthly?: TimeseriesPoint[]
  clusters?: Record<string, TimeseriesPoint[]>
}

export type ProjectData = {
  meta: {
    project_id: string
    name: string
    source: string
    date_range: [string, string]
    languages: string[]
    totals: { reviews: number; clusters: number }
  }
  aggregates: {
    sentiment_mean: number
    sentiment_dist: { neg: number; neu: number; pos: number }
    rating_hist: [number, number][]
  }
  clusters: Cluster[]
  personas: Persona[]
  timeseries?: Timeseries  // NEW
}