"use client";

import * as React from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app";
import { sentimentToColor } from "@/lib/colors";
import type { Cluster } from "@/lib/types";

type Props = {
  clusters: Cluster[];
};

export default function ThemesTreemap({ clusters }: Props) {
  const { setSelectedClusterId } = useAppStore();
  
  // Prepare data: aggregate small clusters with safety checks
  const data = React.useMemo(() => {
    // Controllo se clusters è un array valido
    if (!clusters || !Array.isArray(clusters) || clusters.length === 0) {
      return [];
    }
    
    // Filtra solo i cluster validi prima di ordinare
    const validClusters = clusters.filter(c => 
      c && 
      typeof c.share === 'number' && 
      c.label && 
      c.id
    );
    
    if (validClusters.length === 0) {
      return [];
    }
    
    const sorted = [...validClusters].sort((a, b) => (b.share || 0) - (a.share || 0));
    const mainClusters = [];
    const smallClusters = [];
    let smallShare = 0;
    
    for (const cluster of sorted) {
      if (cluster.share >= 0.02) { // 2% threshold
        mainClusters.push({
          name: cluster.label.length > 28 
            ? cluster.label.substring(0, 25) + "..." 
            : cluster.label,
          fullName: cluster.label,
          size: Math.max(1, Math.round(cluster.share * 1000)),
          sentiment: cluster.sentiment || 0,
          id: cluster.id,
          share: cluster.share,
          keywords: (cluster.keywords || []).slice(0, 3),
        });
      } else {
        smallClusters.push(cluster);
        smallShare += cluster.share;
      }
    }
    
    // Add "Altri" node if there are small clusters
    if (smallClusters.length > 0) {
      mainClusters.push({
        name: "Altri temi",
        fullName: `${smallClusters.length} temi minori`,
        size: Math.max(1, Math.round(smallShare * 1000)),
        sentiment: 0, // neutral
        id: "altri",
        share: smallShare,
        keywords: ["vari", "minori"],
      });
    }
    
    return mainClusters;
  }, [clusters]);

  const handleClick = (data: any) => {
    if (data && data.id && data.id !== "altri") {
      setSelectedClusterId(data.id);
    }
  };

  // Se non ci sono dati, mostra un placeholder
  if (!data || data.length === 0) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-500 mb-2">Nessun dato disponibile</div>
          <div className="text-sm text-neutral-600">
            I temi verranno visualizzati qui quando disponibili
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          stroke="#27272a"
          isAnimationActive={false}
          onClick={handleClick}
          content={<CustomNode />}
        >
          <Tooltip
            cursor={{ stroke: "#60a5fa", strokeWidth: 2, strokeDasharray: "4 4" }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload;
              if (!p) return null;
              
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-neutral-700 bg-neutral-900/95 backdrop-blur-sm px-4 py-3 shadow-xl"
                >
                  <div className="font-semibold text-white mb-1">
                    {p.fullName || 'Senza nome'}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="text-neutral-300">
                      Share: <span className="text-white font-medium">
                        {((p.share || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-neutral-300">
                      Sentiment: <span className={`font-medium ${
                        p.sentiment > 0.3 ? "text-green-400" :
                        p.sentiment < -0.3 ? "text-red-400" :
                        "text-neutral-400"
                      }`}>
                        {p.sentiment > 0 ? "+" : ""}{(p.sentiment || 0).toFixed(2)}
                      </span>
                    </div>
                    {p.keywords && p.keywords.length > 0 && (
                      <div className="text-neutral-300">
                        Keywords: <span className="text-neutral-100">
                          {p.keywords.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  {p.id !== "altri" && (
                    <div className="text-xs text-blue-400 mt-2">
                      Click per dettagli →
                    </div>
                  )}
                </motion.div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

function CustomNode(props: any) {
  const {
    x,
    y,
    width,
    height,
    name,
    sentiment = 0,
    id,
    share,
  } = props;

  // Controlli di sicurezza per tutti i parametri
  if (!width || !height || width < 20 || height < 20) return null;
  
  // Assicurati che name sia sempre una stringa
  const safeName = name || "";

  // Enhanced color scheme with gradients
  const getNodeStyle = React.useMemo(() => {
    let bgColor, textColor, borderColor;
    
    if (sentiment > 0.3) {
      // Positive - Green
      bgColor = "#10b981";
      textColor = "#ffffff";
      borderColor = "#065f46";
    } else if (sentiment < -0.3) {
      // Negative - Red
      bgColor = "#ef4444";
      textColor = "#ffffff";
      borderColor = "#7f1d1d";
    } else {
      // Neutral - Blue/Gray
      bgColor = "#6b7280";
      textColor = "#ffffff";
      borderColor = "#374151";
    }
    
    return { bgColor, textColor, borderColor };
  }, [sentiment]);

  // Dynamic font sizing based on area
  const fontSize = React.useMemo(() => {
    const area = width * height;
    if (area > 20000) return 16;
    if (area > 10000) return 14;
    if (area > 5000) return 12;
    if (area > 2000) return 11;
    return 10;
  }, [width, height]);

  // Determine what content to show based on size
  const showFullContent = width > 100 && height > 80;
  const showName = width > 60 && height > 40;
  const showPercentage = width > 80 && height > 60;

  // Create a unique gradient ID for this node
  const gradientId = `gradient-${id}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <g>
      {/* Gradient definition */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: getNodeStyle.bgColor, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: getNodeStyle.borderColor, stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Main rectangle with gradient */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`url(#${gradientId})`}
        stroke={getNodeStyle.borderColor}
        strokeWidth={1.5}
        rx={6}
        className="cursor-pointer transition-all duration-200"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        }}
      />

      {/* Overlay for hover effect */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="white"
        fillOpacity={0}
        className="hover:fillOpacity-10 transition-all duration-200"
        rx={6}
      />
      
      {showName && (
        <foreignObject x={x} y={y} width={width} height={height}>
          <div className="h-full w-full flex flex-col items-center justify-center p-2 pointer-events-none">
            <div 
              className="text-center"
              style={{ 
                color: getNodeStyle.textColor,
                fontSize: `${fontSize}px`,
                fontWeight: 600,
                lineHeight: 1.2,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              {/* Name */}
              <div className="truncate px-1" style={{ maxWidth: width - 8 }}>
                {safeName}
              </div>
              
              {/* Percentage if space allows */}
              {showPercentage && share && (
                <div 
                  className="mt-1"
                  style={{ 
                    fontSize: `${fontSize - 2}px`,
                    opacity: 0.9
                  }}
                >
                  {(share * 100).toFixed(1)}%
                </div>
              )}
              
              {/* Sentiment indicator for larger nodes */}
              {showFullContent && (
                <div 
                  className="mt-1 flex items-center justify-center gap-1"
                  style={{ fontSize: `${fontSize - 3}px` }}
                >
                  {sentiment > 0.3 && <span>↑</span>}
                  {sentiment < -0.3 && <span>↓</span>}
                  {sentiment >= -0.3 && sentiment <= 0.3 && <span>→</span>}
                  <span>{sentiment > 0 ? '+' : ''}{sentiment.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </foreignObject>
      )}
      
      {/* Interactive hover outline */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke="white"
        strokeWidth={2}
        strokeOpacity={0}
        rx={6}
        className="hover:strokeOpacity-60 transition-all duration-200"
        style={{ pointerEvents: id === "altri" ? "none" : "auto" }}
      />
    </g>
  );
}