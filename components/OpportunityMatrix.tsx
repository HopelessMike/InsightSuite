"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app";
import { sentimentToColor } from "@/lib/colors";
import type { Cluster } from "@/lib/types";

type Props = { 
  clusters: Cluster[] 
};

type DataPoint = {
  id: string;
  name: string;
  x: number; // negativity ratio
  y: number; // share
  z: number; // size for bubble
  sentiment: number;
  cluster: Cluster;
};

export default function OpportunityMatrix({ clusters }: Props) {
  const { setSelectedClusterId } = useAppStore();
  
  // Calculate data points with proper metrics
  const { data, xSplit, ySplit } = React.useMemo(() => {
    const initialPoints: DataPoint[] = clusters.map(cluster => {
      // Calculate negativity ratio (% of negative sentiment)
      const negRatio = Math.max(0, -cluster.sentiment);
      
      return {
        id: cluster.id,
        name: cluster.label,
        x: Math.max(0, Math.min(1, negRatio)),
        y: Math.max(0, Math.min(1, cluster.share)),
        z: Math.sqrt(cluster.size) * 10, // Increased bubble size for better visibility
        sentiment: cluster.sentiment,
        cluster,
      };
    });

    // Advanced collision detection and resolution
    const points = [...initialPoints];
    const minDistance = 0.035; // Minimum distance between points
    const maxIterations = 50;
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasCollisions = false;
      
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < minDistance && distance > 0) {
            hasCollisions = true;
            
            // Calculate repulsion force
            const force = (minDistance - distance) / distance * 0.5;
            const forceX = dx * force;
            const forceY = dy * force;
            
            // Apply force to both points (with bounds checking)
            points[i].x = Math.max(0, Math.min(1, points[i].x + forceX));
            points[i].y = Math.max(0, Math.min(1, points[i].y + forceY));
            points[j].x = Math.max(0, Math.min(1, points[j].x - forceX));
            points[j].y = Math.max(0, Math.min(1, points[j].y - forceY));
          }
        }
      }
      
      // If no collisions detected, break early
      if (!hasCollisions) break;
    }
    
    // Calculate dynamic thresholds using quantiles
    const xValues = points.map(p => p.x).sort((a, b) => a - b);
    const yValues = points.map(p => p.y).sort((a, b) => a - b);
    
    const getQuantile = (arr: number[], q: number) => {
      const pos = (arr.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      if (arr[base + 1] !== undefined) {
        return arr[base] + rest * (arr[base + 1] - arr[base]);
      } else {
        return arr[base];
      }
    };
    
    const xSplit = Math.max(0.35, getQuantile(xValues, 0.6));
    const ySplit = Math.max(0.20, getQuantile(yValues, 0.6));
    
    return { data: points, xSplit, ySplit };
  }, [clusters]);

  const handleClick = (point: any) => {
    if (point && point.id) {
      setSelectedClusterId(point.id);
    }
  };

  const getQuadrant = (x: number, y: number): string => {
    if (y >= ySplit) {
      return x < xSplit ? "Q1" : "Q2"; // Quick Wins : Must Fix
    } else {
      return x < xSplit ? "Q3" : "Q4"; // Monitor : Strategic
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as DataPoint;
      const quadrant = getQuadrant(point.x, point.y);
      
      const quadrantLabels: Record<string, { label: string; color: string }> = {
        Q1: { label: "Quick Wins", color: "text-green-400" },
        Q2: { label: "Must Fix", color: "text-red-400" },
        Q3: { label: "Osservare", color: "text-neutral-400" },
        Q4: { label: "Strategici", color: "text-amber-400" },
      };
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-neutral-700 bg-neutral-900/95 backdrop-blur-sm px-4 py-3 shadow-xl"
        >
          <div className="font-semibold text-white mb-2">
            {point.name}
          </div>
          <div className="space-y-1 text-sm">
            <div className="text-neutral-300">
              Quadrante: <span className={`font-medium ${quadrantLabels[quadrant].color}`}>
                {quadrantLabels[quadrant].label}
              </span>
            </div>
            <div className="text-neutral-300">
              Share: <span className="text-white font-medium">
                {(point.y * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-neutral-300">
              Negatività: <span className="text-white font-medium">
                {(point.x * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-neutral-300">
              Sentiment: <span className={`font-medium ${
                point.sentiment > 0.3 ? "text-green-400" :
                point.sentiment < -0.3 ? "text-red-400" :
                "text-neutral-400"
              }`}>
                {point.sentiment > 0 ? "+" : ""}{point.sentiment.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-xs text-blue-400 mt-2">
            Click per analizzare →
          </div>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      <div className="h-[420px] w-full relative">
        {/* Quadrants overlay */}
        <div className="insightsuite-quadrants">
          <div className="insightsuite-q1" />
          <div className="insightsuite-q2" />
          <div className="insightsuite-q3" />
          <div className="insightsuite-q4" />
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
            <CartesianGrid 
              stroke="#27272a" 
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              tick={{ fill: "#a3a3a3", fontSize: 11 }}
              label={{ 
                value: "Criticità (% Negatività)", 
                position: "insideBottom", 
                offset: -5,
                fill: "#737373",
                fontSize: 12
              }}
            />
            
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              tick={{ fill: "#a3a3a3", fontSize: 11 }}
              label={{ 
                value: "Rilevanza (Share)", 
                angle: -90, 
                position: "insideLeft",
                fill: "#737373",
                fontSize: 12
              }}
            />
            
            {/* Reference lines for quadrants */}
            <ReferenceLine 
              x={xSplit} 
              stroke="#525252" 
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <ReferenceLine 
              y={ySplit} 
              stroke="#525252" 
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            
            <Tooltip 
              cursor={{ strokeDasharray: "3 3", stroke: "#60a5fa" }}
              content={<CustomTooltip />}
            />
            
            <Scatter 
              data={data} 
              fill="#60a5fa"
              onClick={handleClick}
            >
              {data.map((entry, index) => {
                // Calculate dynamic stroke width based on proximity to other points
                const proximityBoost = data.filter(other => {
                  if (other.id === entry.id) return false;
                  const distance = Math.sqrt(
                    Math.pow(other.x - entry.x, 2) + Math.pow(other.y - entry.y, 2)
                  );
                  return distance < 0.08;
                }).length;
                
                const strokeWidth = Math.max(2, 2 + proximityBoost * 0.5);
                const shadowIntensity = Math.max(0.4, 0.4 + proximityBoost * 0.2);
                
                return (
                  <Cell 
                    key={`cell-${index}`}
                    fill={sentimentToColor(entry.sentiment)}
                    fillOpacity={0.9}
                    stroke="#ffffff"
                    strokeWidth={strokeWidth}
                    strokeOpacity={0.8}
                    className="cursor-pointer hover:fillOpacity-100 transition-all duration-200"
                    style={{
                      filter: `drop-shadow(0 4px 8px rgba(0,0,0,${shadowIntensity}))`,
                    }}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="font-semibold text-green-400 mb-1">Quick Wins</div>
          <div className="insightsuite-muted">Alto impatto, facile fix</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="font-semibold text-red-400 mb-1">Must Fix</div>
          <div className="insightsuite-muted">Criticità urgenti</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-neutral-500/10 border border-neutral-500/20">
          <div className="font-semibold text-neutral-300 mb-1">Osservare</div>
          <div className="insightsuite-muted">Basso impatto</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="font-semibold text-amber-400 mb-1">Strategici</div>
          <div className="insightsuite-muted">Alta negatività</div>
        </div>
      </div>
    </div>
  );
}