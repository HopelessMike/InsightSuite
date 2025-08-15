"use client"

import { Treemap, ResponsiveContainer, Cell, Tooltip } from "recharts"
import { Card } from "@/components/ui/card"
import type { Cluster } from "@/lib/types"
import { useAppStore } from "@/store/app"
import { motion } from "framer-motion"

interface ThemesTreemapProps {
  clusters: Cluster[]
}

export function ThemesTreemap({ clusters }: ThemesTreemapProps) {
  const { setSelectedClusterId } = useAppStore()

  const data = clusters.map((cluster) => ({
    name: cluster.label,
    size: cluster.share * 1000,
    sentiment: cluster.sentiment,
    id: cluster.id,
  }))

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return "hsl(142, 76%, 36%)" // Green
    if (sentiment < -0.3) return "hsl(0, 84%, 60%)" // Red
    return "hsl(240, 5%, 64%)" // Gray
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">Share: {(data.size / 10).toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">
            Sentiment: {data.sentiment > 0 ? "+" : ""}
            {data.sentiment.toFixed(2)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4">Temi Principali</h3>
        <div style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#374151"
              strokeWidth={2}
              onClick={(data) => {
                if (data && data.id) {
                  setSelectedClusterId(data.id)
                }
              }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getSentimentColor(entry.sentiment)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  )
}
