"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  icon?: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
};

export default function StatCard({ 
  icon,
  title, 
  value, 
  subtitle, 
  trend,
  trendUp,
  rightSlot,
  className = ""
}: Props) {
  return (
    <motion.div
      className={`insightsuite-card insightsuite-card-hover h-full ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="text-blue-400">
              {icon}
            </div>
          )}
          <h3 className="title-card">{title}</h3>
        </div>
        {rightSlot}
      </div>
      
      <div className="flex items-baseline gap-3">
        <div className="kpi-value bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
          {value}
        </div>
        {trend && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-1 text-sm font-medium ${
              trendUp ? "text-green-400" : "text-red-400"
            }`}
          >
            {trendUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend}
          </motion.div>
        )}
      </div>
      
      {subtitle && (
        <div className="insightsuite-muted text-sm mt-2">
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}