"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Persona } from "@/lib/types"
import { motion } from "framer-motion"
import { User, Target, AlertCircle, MessageSquare } from "lucide-react"

interface PersonaCardProps {
  persona: Persona
  index: number
}

export function PersonaCard({ persona, index }: PersonaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="p-6 rounded-2xl h-full">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{persona.name}</h3>
              <p className="text-sm text-muted-foreground">{(persona.share * 100).toFixed(1)}% degli utenti</p>
            </div>
          </div>

          {/* Goals */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Obiettivi</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {persona.goals.slice(0, 3).map((goal, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {goal}
                </Badge>
              ))}
            </div>
          </div>

          {/* Pains */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium">Pain Points</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {persona.pains.slice(0, 3).map((pain, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {pain}
                </Badge>
              ))}
            </div>
          </div>

          {/* Quotes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Citazioni Tipiche</span>
            </div>
            <div className="space-y-2">
              {persona.quotes.slice(0, 3).map((quote, idx) => (
                <p key={idx} className="text-xs italic text-muted-foreground bg-muted/50 p-2 rounded">
                  "{quote}"
                </p>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div>
            <span className="text-xs font-medium text-muted-foreground">Canali Preferiti:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {persona.channels.slice(0, 3).map((channel, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {channel}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
