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
  Sparkles
} from "lucide-react";
import { useAppStore } from "@/store/app";
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
          
          {/* Sheet */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-neutral-950 border-l border-neutral-800 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-800 p-6 z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {cluster.label || "Cluster Senza Nome"}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Hash className="w-4 h-4 text-neutral-500" />
                      <span className="text-neutral-300">
                        {(cluster.size || 0).toLocaleString()} recensioni
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <BarChart3 className="w-4 h-4 text-neutral-500" />
                      <span className="text-neutral-300">
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
                  className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </motion.button>
              </div>
            </div>
            
            {/* Content */}
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
                    <div className="text-xs text-neutral-400 mb-1">Sentiment</div>
                    <div className={`text-2xl font-bold ${getSentimentColor(sentiment)}`}>
                      {sentiment > 0 ? "+" : ""}{sentiment.toFixed(2)}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    className="p-4 rounded-xl bg-blue-600/10 border border-blue-600/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-xs text-neutral-400 mb-1">Opportunity</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {opportunityScore.toFixed(2)}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    className="p-4 rounded-xl bg-purple-600/10 border border-purple-600/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-xs text-neutral-400 mb-1">Trend</div>
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
                  <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
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
                            tick={{ fontSize: 11, fill: "#737373" }}
                            tickLine={false}
                            axisLine={{ stroke: "#404040" }}
                          />
                          <YAxis 
                            tick={{ fontSize: 11, fill: "#737373" }}
                            tickLine={false}
                            axisLine={{ stroke: "#404040" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#171717",
                              border: "1px solid #404040",
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
                  <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
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

                {/* Summary */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-600/20">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Riassunto AI
                  </h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {summary}
                  </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {strengths.length > 0 && (
                    <div className="p-5 rounded-xl bg-green-600/10 border border-green-600/20">
                      <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Punti di Forza
                      </h3>
                      <ul className="space-y-2">
                        {strengths.map((strength, idx) => (
                          <motion.li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-neutral-300"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <span className="text-green-400 mt-0.5">✓</span>
                            {strength}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {weaknesses.length > 0 && (
                    <div className="p-5 rounded-xl bg-red-600/10 border border-red-600/20">
                      <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Criticità
                      </h3>
                      <ul className="space-y-2">
                        {weaknesses.map((weakness, idx) => (
                          <motion.li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-neutral-300"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <span className="text-red-400 mt-0.5">!</span>
                            {weakness}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Representative Quotes */}
                {quotes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Quote className="w-4 h-4 text-amber-400" />
                      Citazioni Rappresentative
                    </h3>
                    <div className="space-y-3">
                      {quotes.slice(0, 5).map((quote, idx) => (
                        <motion.div
                          key={quote.id || idx}
                          className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm text-neutral-300 italic leading-relaxed">
                                "{quote.text || ''}"
                              </p>
                              <div className="flex items-center gap-3 mt-3">
                                <span className="text-xs text-neutral-500">
                                  {(quote.lang || 'N/A').toUpperCase()}
                                </span>
                                {quote.rating && (
                                  <span className="text-xs text-yellow-400">
                                    {"⭐".repeat(quote.rating)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <motion.button
                                onClick={() => handleCopyQuote(quote.text || '', quote.id || `quote-${idx}`)}
                                className="p-1.5 rounded hover:bg-neutral-800 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {copiedQuote === (quote.id || `quote-${idx}`) ? (
                                  <span className="text-xs text-green-400">✓</span>
                                ) : (
                                  <Copy className="w-3 h-3 text-neutral-500" />
                                )}
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    className="flex-1 btn-primary justify-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </motion.button>
                  <motion.button
                    className="flex-1 btn-secondary justify-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Add to Storyboard
                    <ChevronRight className="w-4 h-4 ml-2" />
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