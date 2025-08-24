"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export default function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  
  return (
    <motion.button
      onClick={() => setLocale(locale === 'it' ? 'en' : 'it')}
      className="p-2.5 rounded-full bg-neutral-800/50 backdrop-blur-sm hover:bg-neutral-700/50 transition-colors group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Change language"
      title="Change language"
    >
      <div className="flex items-center gap-1.5">
        <Globe className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-medium text-neutral-300 uppercase">
          {locale}
        </span>
      </div>
    </motion.button>
  );
}