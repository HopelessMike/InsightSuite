"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Briefcase, 
  Users, 
  Wallet, 
  Backpack,
  Heart,
  Target,
  AlertCircle,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Smartphone
} from "lucide-react";
import type { Persona } from "@/lib/types";

type Props = {
  persona: Persona;
  index?: number;
};

export default function PersonaCard({ persona, index = 0 }: Props) {
  // Dynamic icon selection based on persona keywords
  const getPersonaIcon = () => {
    const name = persona.name.toLowerCase();
    const goals = persona.goals.join(" ").toLowerCase();
    
    if (name.includes("business") || goals.includes("work") || goals.includes("meeting")) {
      return <Briefcase className="w-5 h-5" />;
    }
    if (name.includes("family") || goals.includes("children") || goals.includes("kids")) {
      return <Users className="w-5 h-5" />;
    }
    if (name.includes("budget") || goals.includes("saving") || goals.includes("cheap")) {
      return <Wallet className="w-5 h-5" />;
    }
    if (name.includes("travel") || goals.includes("backpack") || goals.includes("solo")) {
      return <Backpack className="w-5 h-5" />;
    }
    if (name.includes("quality") || goals.includes("premium")) {
      return <Heart className="w-5 h-5" />;
    }
    return <User className="w-5 h-5" />;
  };

  // Gradient palettes for variety
  const gradients = [
    "from-blue-600/20 via-blue-500/10 to-transparent",
    "from-emerald-600/20 via-emerald-500/10 to-transparent",
    "from-amber-600/20 via-amber-500/10 to-transparent",
    "from-purple-600/20 via-purple-500/10 to-transparent",
    "from-rose-600/20 via-rose-500/10 to-transparent",
  ];

  const gradient = gradients[index % gradients.length];
  
  // Icon colors matching gradients
  const iconColors = [
    "text-blue-400",
    "text-emerald-400",
    "text-amber-400",
    "text-purple-400",
    "text-rose-400",
  ];
  
  const iconColor = iconColors[index % iconColors.length];

  // Channel icons mapping
  const getChannelIcon = (channel: string) => {
    const lower = channel.toLowerCase();
    if (lower.includes("email")) return <Mail className="w-3 h-3" />;
    if (lower.includes("phone") || lower.includes("call")) return <Phone className="w-3 h-3" />;
    if (lower.includes("mobile") || lower.includes("app")) return <Smartphone className="w-3 h-3" />;
    if (lower.includes("web") || lower.includes("online")) return <Globe className="w-3 h-3" />;
    return null;
  };

  return (
    <motion.div
      className={`insightsuite-card relative overflow-hidden bg-gradient-to-br ${gradient} h-full min-h-[450px] flex flex-col`}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-full -ml-12 -mb-12" />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <motion.div 
            className={`p-2.5 rounded-xl bg-neutral-800/50 backdrop-blur-sm ${iconColor}`}
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            {getPersonaIcon()}
          </motion.div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">
              {persona.name}
            </h3>
            <div className="text-sm insightsuite-muted">
              {(persona.share * 100).toFixed(0)}% degli utenti
            </div>
          </div>
        </div>

        {/* Goals */}
        {persona.goals.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium">Obiettivi</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {persona.goals.slice(0, 5).map((goal, i) => (
                <motion.span
                  key={i}
                  className="badge"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {goal}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Pain Points */}
        {persona.pains.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium">Pain Points</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {persona.pains.slice(0, 5).map((pain, i) => (
                <motion.span
                  key={i}
                  className="badge"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {pain}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Quotes */}
        {persona.quotes.length > 0 && (
          <div className="mb-3 flex-grow">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Citazioni Tipiche</span>
            </div>
            <div className="space-y-1.5">
              {persona.quotes.slice(0, 3).map((quote, i) => (
                <motion.div
                  key={i}
                  className="text-xs italic text-neutral-300 bg-neutral-900/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-neutral-800/50"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  "{quote}"
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Channels - Push to bottom */}
        {persona.channels.length > 0 && (
          <div className="mt-auto pt-3">
            <span className="text-xs font-medium text-neutral-400 mb-1.5 block">
              Canali Preferiti
            </span>
            <div className="flex flex-wrap gap-1.5">
              {persona.channels.slice(0, 4).map((channel, i) => (
                <motion.span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-800/50 text-xs text-neutral-300 border border-neutral-700/50"
                  whileHover={{ scale: 1.05 }}
                >
                  {getChannelIcon(channel)}
                  {channel}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}