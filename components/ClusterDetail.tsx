"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  TrendingDown,
  Hash,
  BarChart3,
  Quote,
  Target,
  AlertCircle,
  ExternalLink,
  Copy,
  Download,
  ChevronRight,
  Sparkles,
  FileText,
  Plus
} from "lucide-react";
import { useAppStore } from "@/store/app";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart
} from "recharts";
import type { Cluster } from "@/lib/types";

interface ClusterDetailProps {
  cluster: Cluster | null;
}

export default function ClusterDetail({ cluster }: ClusterDetailProps) {
  const { selectedClusterId, setSelectedClusterId } = useAppStore();
  const { theme } = useTheme();
  const [copiedQuote, setCopiedQuote] = React.useState<string | null>(null);
  
  const isOpen = !!selectedClusterId && !!cluster;

  const handleCopyQuote = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuote(id);
    setTimeout(() => setCopiedQuote(null), 2000);
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return "text-green-400";
    if (sentiment < -0.3) return "text-red-400";
    return "text-neutral-400";
  };

  const getSentimentBg = (sentiment: number) => {
    if (sentiment > 0.3) return "bg-green-600/10 border-green-600/20";
    if (sentiment < -0.3) return "bg-red-600/10 border-red-600/20";
    return "bg-neutral-600/10 border-neutral-600/20";
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.3) return <TrendingUp className="w-4 h-4" />;
    if (sentiment < -0.3) return <TrendingDown className="w-4 h-4" />;
    return <BarChart3 className="w-4 h-4" />;
  };

  // Fix 4: Export Report functionality
  const handleExportReport = () => {
    if (!cluster) return;
    
    const reportContent = `
# Cluster Report: ${cluster.label}

## Overview
- **Size**: ${cluster.size.toLocaleString()} reviews
- **Share**: ${(cluster.share * 100).toFixed(1)}%
- **Sentiment**: ${cluster.sentiment.toFixed(2)}
- **Opportunity Score**: ${cluster.opportunity_score.toFixed(2)}

## Summary
${cluster.summary || 'No summary available'}

## Keywords
${(cluster.keywords || []).join(', ')}

## Strengths
${(cluster.strengths || []).map(s => `- ${s}`).join('\n')}

## Weaknesses
${(cluster.weaknesses || []).map(w => `- ${w}`).join('\n')}

## Representative Quotes
${(cluster.quotes || []).slice(0, 5).map(q => `"${q.text}"`).join('\n\n')}

---
Generated on ${new Date().toLocaleString()}
`;

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cluster-${cluster.id}-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fix 4: Add to Storyboard functionality
  const handleAddToStoryboard = () => {
    if (!cluster) return;
    
    // Save to localStorage for now (in production, this would be an API call)
    const storyboard = JSON.parse(localStorage.getItem('insightsuite-storyboard') || '[]');
    storyboard.push({
      id: Date.now().toString(),
      clusterId: cluster.id,
      label: cluster.label,
      sentiment: cluster.sentiment,
      share: cluster.share,
      addedAt: new Date().toISOString()
    });
    localStorage.setItem('insightsuite-storyboard', JSON.stringify(storyboard));
    
    // Show confirmation
    alert('Cluster added to storyboard successfully!');
  };

  if (!cluster) return null;

  // Safe access to properties with defaults
  const sentiment = cluster.sentiment || 0;
  const opportunityScore = cluster.opportunity_score || 0;
  const trend = cluster.trend || [];
  const keywords = cluster.keywords || [];
  const summary = cluster.summary || "Nessun riassunto disponibile";
  const strengths = cluster.strengths || [];
  const weaknesses = cluster.weaknesses || [];
  const quotes = cluster.quotes || [];

  // Fix 3: Theme-aware styles
  const bgColor = theme === 'light' ? 'bg-white' : 'bg-neutral-950';
  const borderColor = theme === 'light' ? 'border-neutral-200' : 'border-neutral-800';
  const textColor = theme === 'light' ? 'text-neutral-900' : 'text-white';
  const mutedColor = theme === 'light' ? 'text-neutral-600' : 'text-neutral-400';
  const surfaceBg = theme === 'light' ? 'bg-neutral-50' : 'bg-neutral-800/50';
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSelectedClusterId(null)}
          />
          
          {/* Sheet - Fix 3: Theme-aware background */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`fixed right-0 top-0 h-full w-full max-w-2xl ${bgColor} ${borderColor} border-l shadow-2xl z-50 overflow-hidden`}
          >
            {/* Header - Fix 3: Theme-aware */}
            <div className={`sticky top-0 ${bgColor} backdrop-blur-sm ${borderColor} border-b p-6 z-10`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className={`text-2xl font-bold ${textColor} mb-2`}>
                    {cluster.label || "Cluster Senza Nome"}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Hash className={`w-4 h-4 ${mutedColor}`} />
                      <span className={mutedColor}>
                        {(cluster.size || 0).toLocaleString()} recensioni
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <BarChart3 className={`w-4 h-4 ${mutedColor}`} />
                      <span className={mutedColor}>
                        {((cluster.share || 0) * 100).toFixed(1)}% share
                      </span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-sm ${getSentimentColor(sentiment)}`}>
                      {getSentimentIcon(sentiment)}
                      <span className="font-medium">
                        {sentiment > 0 ? "+" : ""}{sentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={() => setSelectedClusterId(null)}
                  className={`p-2 rounded-lg hover:${theme === 'light' ? 'bg-neutral-100' : 'bg-neutral-800'} transition-colors`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className={`w-5 h-5 ${mutedColor}`} />
                </motion.button>
              </div>
            </div>
            
            {/* Content - Fix 3: Theme-aware */}
            <div className="h-[calc(100%-120px)] overflow-y-auto p-6">
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <motion.div
                    className={`p-4 rounded-xl border ${getSentimentBg(sentiment)}`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className={`text-xs ${mutedColor} mb-1`}>Sentiment</div>
                    <div className={`text-2xl font-bold ${getSentimentColor(sentiment)}`}>
                      {sentiment > 0 ? "+" : ""}{sentiment.toFixed(2)}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    className="p-4 rounded-xl bg-blue-600/10 border border-blue-600/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className={`text-xs ${mutedColor} mb-1`}>Opportunity</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {opportunityScore.toFixed(2)}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    className="p-4 rounded-xl bg-purple-600/10 border border-purple-600/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className={`text-xs ${mutedColor} mb-1`}>Trend</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {trend.length > 1 && 
                        trend[trend.length - 1].count > trend[0].count 
                        ? "↑" : "↓"}
                      {trend.length === 0 && "—"}
                    </div>
                  </motion.div>
                </div>

                {/* Trend Chart */}
                {trend.length > 0 && (
                  <div className={`p-5 rounded-xl ${theme === 'light' ? 'bg-neutral-50' : 'bg-neutral-900/50'} border ${borderColor}`}>
                    <h3 className={`font-semibold ${textColor} mb-4 flex items-center gap-2`}>
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Trend Temporale
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend}>
                          <defs>
                            <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="week" 
                            tick={{ fontSize: 11, fill: theme === 'light' ? '#525252' : '#737373' }}
                            tickLine={false}
                            axisLine={{ stroke: theme === 'light' ? '#d4d4d4' : '#404040' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 11, fill: theme === 'light' ? '#525252' : '#737373' }}
                            tickLine={false}
                            axisLine={{ stroke: theme === 'light' ? '#d4d4d4' : '#404040' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: theme === 'light' ? '#ffffff' : '#171717',
                              border: `1px solid ${theme === 'light' ? '#e5e5e5' : '#404040'}`,
                              borderRadius: "8px",
                              fontSize: "12px"
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorTrend)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {keywords.length > 0 && (
                  <div className={`p-5 rounded-xl ${theme === 'light' ? 'bg-neutral-50' : 'bg-neutral-900/50'} border ${borderColor}`}>
                    <h3 className={`font-semibold ${textColor} mb-3 flex items-center gap-2`}>
                      <Hash className="w-4 h-4 text-purple-400" />
                      Parole Chiave
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword, idx) => (
                        <motion.span
                          key={idx}
                          className="px-3 py-1.5 rounded-full bg-purple-600/20 text-purple-300 text-sm border border-purple-600/30"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          {keyword}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions - Fix 4: Improved buttons with functionality */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    onClick={handleExportReport}
                    className="flex-1 btn-primary justify-center flex items-center gap-2 px-6 py-3 rounded-xl font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download className="w-4 h-4" />
                    Export Report
                  </motion.button>
                  <motion.button
                    onClick={handleAddToStoryboard}
                    className="flex-1 btn-secondary justify-center flex items-center gap-2 px-6 py-3 rounded-xl font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    Add to Storyboard
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}