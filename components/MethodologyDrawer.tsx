"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Info, 
  X, 
  Code2, 
  Brain, 
  Database,
  Sparkles,
  GitBranch,
  Shield,
  ExternalLink
} from "lucide-react";
import { useTheme } from "next-themes";

type Section = {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
  color: string;
};

const sections: Section[] = [
  {
    icon: <Database className="w-5 h-5" />,
    title: "Data Collection & Processing",
    color: "text-blue-400",
    content: (
      <div className="space-y-2 text-sm">
        <p className="text-neutral-300">
          Sistema di raccolta multi-sorgente con normalizzazione automatica dei dati.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="p-2 rounded-lg bg-neutral-800/50">
            <div className="text-xs font-medium text-blue-400 mb-1">Sources</div>
            <div className="text-xs text-neutral-400">
              B&B Guest Reviews, Booking Platforms, Hospitality Data
            </div>
          </div>
          <div className="p-2 rounded-lg bg-neutral-800/50">
            <div className="text-xs font-medium text-blue-400 mb-1">Processing</div>
            <div className="text-xs text-neutral-400">
              Deduplication, Language Detection, Normalization
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "AI-Powered Analysis",
    color: "text-purple-400",
    content: (
      <div className="space-y-3 text-sm">
        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-600/10 to-transparent border border-purple-600/20">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-purple-400">Embeddings</span>
          </div>
          <p className="text-xs text-neutral-300">
            <strong>Voyage AI 3-lite</strong> • 1024-dimensional semantic vectors
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Multilingual support (100+ languages)
          </p>
        </div>
        
        <div className="p-3 rounded-lg bg-gradient-to-r from-green-600/10 to-transparent border border-green-600/20">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-green-400" />
            <span className="font-medium text-green-400">Clustering</span>
          </div>
          <p className="text-xs text-neutral-300">
            <strong>HDBSCAN Algorithm</strong> • Hierarchical density-based clustering
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Adaptive parameters: min_cluster_size 30-80 based on N
          </p>
        </div>
        
        <div className="p-3 rounded-lg bg-gradient-to-r from-amber-600/10 to-transparent border border-amber-600/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-amber-400">LLM Summarization</span>
          </div>
          <p className="text-xs text-neutral-300">
            <strong>Claude 3.5 Sonnet</strong> • Context-aware summaries
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            MapReduce on clusters for scalability
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Privacy & Ethics",
    color: "text-green-400",
    content: (
      <div className="space-y-2 text-sm">
        <p className="text-neutral-300">
          Progettato con privacy-by-design e conformità GDPR.
        </p>
        <ul className="space-y-2 mt-3">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-xs text-neutral-300">
              Anonymization di tutti i dati personali
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-xs text-neutral-300">
              No-bias prompting per personas inclusive
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-xs text-neutral-300">
              Data retention policies (90 giorni)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-xs text-neutral-300">
              Encryption at rest and in transit
            </span>
          </li>
        </ul>
      </div>
    ),
  },
];

const attributions = [
  {
    name: "Airbnb B&B Reviews",
    license: "Synthetic Dataset",
    description: "Tutti i dataset utilizzati sono stati prodotti in maniera sintetica, utilizzando Large Language Models appositamente fine tunati.",
    url: "#"
  },
  {
    name: "BCA Mobile Reviews",
    license: "Synthetic Dataset",
    description: "Tutti i dataset utilizzati sono stati prodotti in maniera sintetica, utilizzando Large Language Models appositamente fine tunati.",
    url: "#"
  },
  {
    name: "Women's E-Commerce",
    license: "Synthetic Dataset",
    description: "Tutti i dataset utilizzati sono stati prodotti in maniera sintetica, utilizzando Large Language Models appositamente fine tunati.",
    url: "#"
  },
];

export default function MethodologyDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState(0);
  const { theme } = useTheme();

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600/20 border border-blue-600/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-600/40 transition-all duration-200 font-medium backdrop-blur-sm"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Info className="w-4 h-4" />
        Metodologia & Attribution
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`fixed right-0 top-0 h-full w-full max-w-lg shadow-2xl z-50 overflow-hidden ${
                theme === 'light' 
                  ? 'bg-white border-l border-neutral-200' 
                  : 'bg-neutral-950 border-l border-neutral-800'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-6 border-b ${
                theme === 'light' ? 'border-neutral-200' : 'border-neutral-800'
              }`}>
                <div>
                  <h2 className={`text-xl font-semibold ${
                    theme === 'light' ? 'text-neutral-900' : 'text-white'
                  }`}>
                    Metodologia & Attribution
                  </h2>
                  <p className={`text-sm mt-1 ${
                    theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
                  }`}>
                    Come funziona InsightSuite
                  </p>
                </div>
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'light' 
                      ? 'hover:bg-neutral-100' 
                      : 'hover:bg-neutral-800'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className={`w-5 h-5 ${
                    theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
                  }`} />
                </motion.button>
              </div>
              
              {/* Content */}
              <div className="h-[calc(100%-80px)] overflow-y-auto p-6">
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                  {sections.map((section, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => setActiveSection(idx)}
                      className={`p-2 rounded-lg transition-all ${
                        activeSection === idx 
                          ? theme === 'light' 
                            ? 'bg-neutral-100 text-neutral-900' 
                            : 'bg-neutral-800 text-white'
                          : theme === 'light'
                            ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                            : 'text-neutral-500 hover:text-white hover:bg-neutral-800/50'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={activeSection === idx ? section.color : ""}>
                        {section.icon}
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                {/* Active Section */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-4">
                      <div className={`flex items-center gap-2 mb-3 ${sections[activeSection].color}`}>
                        {sections[activeSection].icon}
                        <h3 className="font-semibold text-lg">
                          {sections[activeSection].title}
                        </h3>
                      </div>
                      <div className={theme === 'light' ? '[&_p]:text-neutral-700 [&_span]:text-neutral-600' : ''}>
                        {sections[activeSection].content}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                
                {/* Tech Stack */}
                <div className={`mt-8 p-4 rounded-xl border ${
                  theme === 'light' 
                    ? 'bg-neutral-50 border-neutral-200' 
                    : 'bg-neutral-900/50 border-neutral-800'
                }`}>
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${
                    theme === 'light' ? 'text-neutral-900' : 'text-white'
                  }`}>
                    <Code2 className="w-4 h-4 text-blue-400" />
                    Tech Stack
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-500'}>Frontend</span>
                        <span className={theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}>Next.js 14</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-500'}>UI</span>
                        <span className={theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}>Tailwind + Framer</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-500'}>Charts</span>
                        <span className={theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}>Recharts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-500'}>Pipeline</span>
                        <span className={theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}>Python 3.11</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-500'}>ML</span>
                        <span className={theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}>scikit + HDBSCAN</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-500'}>API</span>
                        <span className={theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}>FastAPI</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Dataset Attribution */}
                <div className="mt-8">
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${
                    theme === 'light' ? 'text-neutral-900' : 'text-white'
                  }`}>
                    <Database className="w-4 h-4 text-green-400" />
                    Dataset Attribution
                  </h4>
                  <div className="space-y-3">
                    {attributions.map((attr, idx) => (
                      <motion.div
                        key={idx}
                        className={`p-3 rounded-lg border transition-colors ${
                          theme === 'light'
                            ? 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                            : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className={`font-medium text-sm ${
                              theme === 'light' ? 'text-neutral-900' : 'text-white'
                            }`}>
                              {attr.name}
                            </div>
                            <div className={`text-xs mt-1 ${
                              theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
                            }`}>
                              {attr.description}
                            </div>
                            <div className="text-xs text-blue-400 mt-1">
                              {attr.license}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Footer Note */}
                <div className="mt-8 p-4 rounded-lg bg-blue-600/10 border border-blue-600/20">
                  <p className="text-xs text-blue-400">
                    ℹ️ Questa è una demo con dati sintetici generati tramite LLM. 
                    Tutti i dataset utilizzati sono stati prodotti in maniera sintetica. 
                    In produzione, InsightSuite si integra con le tue fonti dati aziendali 
                    rispettando tutti i requisiti di privacy e compliance.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}