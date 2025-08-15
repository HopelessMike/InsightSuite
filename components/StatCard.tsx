"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, subtitle, children, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={`p-6 rounded-2xl ${className}`}>
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {children}
        </div>
      </Card>
    </motion.div>
  )
}
