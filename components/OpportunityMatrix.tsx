"use client"

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
} from "recharts"
import { Card } from "@/components/ui/card"
import type { Cluster } from "@/lib/types"
import { useAppStore } from "@/store/app"
import { motion } from "framer-motion"

interface OpportunityMatrixProps {
  clusters: Cluster[]
}

export function OpportunityMatrix({ clusters }: OpportunityMatrixProps) {
  const { compareSet, toggleCompareCluster } = useAppStore()

  const data = clusters.map((cluster) => ({
    x: Math.max(0, -cluster.sentiment), // negIntensity
    y: cluster.share,
    name: cluster.label,
    id: cluster.id,
    sentiment: cluster.sentiment,
    isSelected: compareSet.has(cluster.id),
  }))

  const handleClick = (data: any, event: any) => {
    if (event?.ctrlKey || event?.metaKey) {
      toggleCompareCluster(data.id)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">Share: {(data.y * 100).toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">
            Sentiment: {data.sentiment > 0 ? "+" : ""}
            {data.sentiment.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Ctrl+Click per confrontare</p>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4">Matrice delle Opportunità</h3>
        <div style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                dataKey="x"
                name="Intensità Negativa"
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Share"
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />

              {/* Quadranti */}
              <ReferenceArea x1={0} x2={0.5} y1={0.5} y2={1} fill="hsl(142, 76%, 36%)" fillOpacity={0.1} />
              <ReferenceArea x1={0.5} x2={1} y1={0.5} y2={1} fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />
              <ReferenceArea x1={0} x2={0.5} y1={0} y2={0.5} fill="hsl(240, 5%, 64%)" fillOpacity={0.1} />
              <ReferenceArea x1={0.5} x2={1} y1={0} y2={0.5} fill="hsl(45, 93%, 47%)" fillOpacity={0.1} />

              <Scatter data={data} fill="hsl(217, 91%, 60%)" onClick={handleClick}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isSelected ? "hsl(45, 93%, 47%)" : "hsl(217, 91%, 60%)"}
                    stroke={entry.isSelected ? "hsl(45, 93%, 47%)" : "transparent"}
                    strokeWidth={entry.isSelected ? 3 : 0}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </Scatter>
              <Tooltip content={<CustomTooltip />} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Labels per i quadranti */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
          <div className="text-center">
            <div className="font-medium text-green-600">Quick Wins</div>
            <div className="text-muted-foreground">Alto impatto, facile fix</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-red-600">Must Fix</div>
            <div className="text-muted-foreground">Alto impatto, problemi critici</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Osservare</div>
            <div className="text-muted-foreground">Basso impatto, monitorare</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-yellow-600">Strategici</div>
            <div className="text-muted-foreground">Basso impatto, alta negatività</div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
