"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Cluster } from "@/lib/types"
import { useAppStore } from "@/store/app"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react"
import { motion } from "framer-motion"

interface ClusterDetailProps {
  cluster: Cluster | null
}

export function ClusterDetail({ cluster }: ClusterDetailProps) {
  const { selectedClusterId, setSelectedClusterId } = useAppStore()
  const isOpen = !!selectedClusterId && !!cluster

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return "text-green-600"
    if (sentiment < -0.3) return "text-red-600"
    return "text-gray-600"
  }

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.3) return <TrendingUp className="w-4 h-4" />
    if (sentiment < -0.3) return <TrendingDown className="w-4 h-4" />
    return null
  }

  if (!cluster) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && setSelectedClusterId(null)}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{cluster.label}</SheetTitle>
        </SheetHeader>

        <motion.div
          className="space-y-6 mt-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Metriche principali */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Dimensione</div>
              <div className="text-2xl font-bold">{cluster.size.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{(cluster.share * 100).toFixed(1)}% del totale</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Sentiment</div>
              <div className={`text-2xl font-bold flex items-center gap-2 ${getSentimentColor(cluster.sentiment)}`}>
                {cluster.sentiment > 0 ? "+" : ""}
                {cluster.sentiment.toFixed(2)}
                {getSentimentIcon(cluster.sentiment)}
              </div>
              <div className="text-xs text-muted-foreground">
                Opportunity Score: {cluster.opportunity_score.toFixed(2)}
              </div>
            </Card>
          </div>

          {/* Trend */}
          <Card className="p-4">
            <h4 className="font-medium mb-3">Trend Temporale</h4>
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cluster.trend}>
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(217, 91%, 60%)", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Keywords */}
          <div>
            <h4 className="font-medium mb-3">Parole Chiave</h4>
            <div className="flex flex-wrap gap-2">
              {cluster.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>

          {/* Summary */}
          <Card className="p-4">
            <h4 className="font-medium mb-2">Riassunto</h4>
            <p className="text-sm text-muted-foreground">{cluster.summary}</p>
          </Card>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-medium mb-3 text-green-600">Punti di Forza</h4>
              <ul className="space-y-1">
                {cluster.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <h4 className="font-medium mb-3 text-red-600">Debolezze</h4>
              <ul className="space-y-1">
                {cluster.weaknesses.map((weakness, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Quotes */}
          <div>
            <h4 className="font-medium mb-3">Citazioni Rappresentative</h4>
            <div className="space-y-3">
              {cluster.quotes.slice(0, 5).map((quote) => (
                <Card key={quote.id} className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm italic">"{quote.text}"</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {quote.lang.toUpperCase()}
                        </Badge>
                        {quote.rating && (
                          <Badge variant="outline" className="text-xs">
                            ⭐ {quote.rating}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  )
}
