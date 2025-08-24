"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Bot, 
  User as UserIcon,
  Sparkles,
  TrendingDown,
  BarChart3,
  Users,
  Loader2
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { ProjectData } from "@/lib/types";


type Message = { 
  role: "user" | "assistant"; 
  text: string;
  timestamp: Date;
};

const QUICK_PROMPTS = [
  {
    icon: <TrendingDown className="w-3 h-3" />,
    text: "Quali cluster stanno peggiorando nel tempo?",
    color: "text-red-400 border-red-400/30 hover:bg-red-400/10"
  },
  {
    icon: <BarChart3 className="w-3 h-3" />,
    text: "Mostrami i 3 temi più critici",
    color: "text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
  },
  {
    icon: <Users className="w-3 h-3" />,
    text: "Quali sono i driver del sentiment negativo?",
    color: "text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
  },
  {
    icon: <Sparkles className="w-3 h-3" />,
    text: "Suggerisci azioni prioritarie",
    color: "text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
  },
];

type Props = {
  data?: ProjectData;
  projectId: "airbnb" | "mobile" | "ecommerce";
};

export default function InsightChat({ data, projectId }: Props) {
  const { t } = useLocale();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    // Only scroll if component is mounted and there are actual messages or if typing
    if (mounted && (messages.length > 0 || isTyping)) {
      scrollToBottom();
    }
  }, [messages, isTyping, mounted]);

  // Real LLM integration
  const handleSend = async (question: string) => {
    if (!question.trim() || isLoading) return;
    
    const userMessage: Message = {
      role: "user",
      text: question.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      // Call the API route with LLM integration
      const response = await fetch('/api/InsightChat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          projectId: projectId
        })
      });

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API Success Response:', result);
      
      // Check if we got a valid answer from the API
      if (result.answer && result.answer.trim() && !result.answer.includes('ANTHROPIC_API_KEY not configured')) {
        // Add assistant message from LLM
        const assistantMessage: Message = {
          role: "assistant",
          text: result.answer,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Use fallback if API key is not configured or response is empty
        throw new Error('LLM service not available or returned empty response');
      }
      
    } catch (error) {
      console.error("Chat error:", error);
      
      // Show a notification that we're using fallback
      const fallbackResponse = "🔄 **Modalità Offline Attiva**\n\n" + generateEnhancedResponse(question, data) + 
        "\n\n*Nota: Al momento sto utilizzando l'analisi locale. Per accedere all'AI Assistant completo, configura la chiave API Anthropic.*";
      
      setMessages(prev => [...prev, {
        role: "assistant",
        text: fallbackResponse,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  // Enhanced local response generator with deep analysis
  const generateEnhancedResponse = (question: string, data?: ProjectData): string => {
    if (!data) {
      return "I dati del progetto non sono ancora caricati. Attendi qualche istante e riprova.";
    }
    
    const q = question.toLowerCase();
    const clusters = data.clusters || [];
    const personas = data.personas || [];
    const meta = data.meta || {};
    const aggregates = data.aggregates || {};
    
    // Cluster peggiorando nel tempo
    if (q.includes("peggior") || q.includes("trend negativ") || q.includes("declino")) {
      const negativeTrends = clusters
        .filter(c => {
          if (!c.trend || c.trend.length < 2) return false;
          const recentTrend = c.trend.slice(-3);
          const avgRecent = recentTrend.reduce((sum, t) => sum + t.count, 0) / recentTrend.length;
          const avgOld = c.trend.slice(0, 3).reduce((sum, t) => sum + t.count, 0) / Math.min(3, c.trend.length);
          return avgRecent < avgOld && c.sentiment < 0;
        })
        .slice(0, 3);
      
      if (negativeTrends.length > 0) {
        return `**Analisi dei Trend Negativi**\n\n` +
          `Ho identificato ${negativeTrends.length} cluster con trend in peggioramento:\n\n` +
          negativeTrends.map((c, i) => 
            `**${i + 1}. ${c.label}**\n` +
            `• Sentiment attuale: ${c.sentiment.toFixed(2)} (${c.sentiment < -0.5 ? 'molto negativo' : 'negativo'})\n` +
            `• Impatto: ${(c.share * 100).toFixed(1)}% delle recensioni\n` +
            `• Trend: -${((1 - (c.trend[c.trend.length-1].count / c.trend[0].count)) * 100).toFixed(0)}% nell'ultimo periodo\n` +
            `• Criticità principali: ${c.weaknesses.slice(0, 2).join(", ")}\n` +
            `• Keywords correlate: ${c.keywords.slice(0, 3).join(", ")}`
          ).join("\n\n") +
          `\n\n**Raccomandazione**: Questi cluster richiedono attenzione immediata. ` +
          `Il cluster "${negativeTrends[0].label}" è particolarmente critico con un calo del ` +
          `${((1 - (negativeTrends[0].trend[negativeTrends[0].trend.length-1].count / negativeTrends[0].trend[0].count)) * 100).toFixed(0)}%.`;
      }
      return "Non ho identificato cluster con trend particolarmente negativi nel periodo analizzato. " +
        "Il sentiment complessivo si mantiene stabile.";
    }
    
    // Temi più critici con analisi approfondita
    if (q.includes("critici") || q.includes("problemi") || q.includes("urgenti")) {
      const criticalClusters = clusters
        .sort((a, b) => {
          const scoreA = (Math.abs(a.sentiment || 0) * (a.share || 0) * 100) + (a.opportunity_score || 0);
          const scoreB = (Math.abs(b.sentiment || 0) * (b.share || 0) * 100) + (b.opportunity_score || 0);
          return scoreB - scoreA;
        })
        .slice(0, 3);
      
      const totalImpact = criticalClusters.reduce((sum, c) => sum + (c.share || 0), 0);
      
      return `**Analisi dei Temi Critici**\n\n` +
        `I 3 temi più critici rappresentano il ${(totalImpact * 100).toFixed(0)}% del totale:\n\n` +
        criticalClusters.map((c, i) => {
          const sentiment = c.sentiment || 0;
          const urgencyLevel = sentiment < -0.5 ? "Critico" : 
                              sentiment < -0.2 ? "Alto" : "Medio";
          
          return `**${i + 1}. ${c.label}** (${urgencyLevel})\n` +
            `• Opportunity Score: ${(c.opportunity_score || 0).toFixed(2)}\n` +
            `• Impatto: ${((c.share || 0) * 100).toFixed(1)}% degli utenti (${(c.size || 0).toLocaleString()} recensioni)\n` +
            `• Sentiment: ${sentiment.toFixed(2)}\n` +
            `• Criticità principali:\n` +
            (c.weaknesses || []).slice(0, 3).map(w => `  - ${w}`).join("\n") + "\n" +
            `• Quote rappresentative: "${c.quotes?.[0]?.text?.substring(0, 100) || 'Non disponibile'}..."`;
        }).join("\n\n") +
        `\n\n**Insight chiave**: Il cluster "${criticalClusters[0]?.label || 'identificato'}" richiede intervento prioritario ` +
        `con ${((criticalClusters[0]?.share || 0) * 100).toFixed(0)}% di impatto sugli utenti.`;
    }
    
    // Driver del sentiment negativo con correlazioni
    if (q.includes("driver") || q.includes("sentiment negativ") || q.includes("causa") || q.includes("motiv")) {
      const negativeDrivers = clusters
        .filter(c => (c.sentiment || 0) < 0)
        .sort((a, b) => ((a.sentiment || 0) * (a.share || 0)) - ((b.sentiment || 0) * (b.share || 0)))
        .slice(0, 4);
      
      const totalNegativeImpact = negativeDrivers.reduce((sum, c) => sum + (c.share || 0), 0);
      const avgNegativeSentiment = negativeDrivers.length > 0 
        ? negativeDrivers.reduce((sum, c) => sum + (c.sentiment || 0), 0) / negativeDrivers.length
        : 0;
      
      return `**Analisi dei Driver del Sentiment Negativo**\n\n` +
        `Ho identificato ${negativeDrivers.length} driver principali che impattano il ${(totalNegativeImpact * 100).toFixed(0)}% degli utenti:\n\n` +
        negativeDrivers.map((c, i) => 
          `**${i + 1}. ${c.label}**\n` +
          `• Contributo negativo: ${Math.abs((c.sentiment || 0) * (c.share || 0) * 100).toFixed(1)} punti\n` +
          `• Problematiche: ${(c.weaknesses || []).slice(0, 2).join(", ") || 'Non specificate'}\n` +
          `• Keywords negative: ${(c.keywords || []).filter(k => k.toLowerCase().includes('non') || k.toLowerCase().includes('problema')).slice(0, 3).join(", ") || 'Non disponibili'}`
        ).join("\n\n") +
        `\n\n**Correlazioni identificate**:\n` +
        `• Sentiment medio negativo: ${avgNegativeSentiment.toFixed(2)}\n` +
        `• Cluster più correlati: ${negativeDrivers.slice(0, 2).map(c => c.label).join(" + ")}\n` +
        `• Pattern ricorrente: ${negativeDrivers.length > 0 && negativeDrivers[0].weaknesses?.length > 0 ? negativeDrivers[0].weaknesses[0] : 'Non identificato'}\n\n` +
        `**Strategia consigliata**: Focus immediato su "${negativeDrivers.length > 0 ? negativeDrivers[0].label : 'le aree critiche identificate'}" ` +
        `per massimizzare l'impatto positivo sul sentiment complessivo.`;
    }
    
    // Azioni prioritarie con roadmap dettagliata
    if (q.includes("azioni") || q.includes("priorit") || q.includes("suggerisci") || q.includes("fare")) {
      const topIssues = clusters
        .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
        .slice(0, 5);
      
      const quickWins = topIssues.filter(c => (c.sentiment || 0) > -0.3 && (c.share || 0) > 0.1);
      const mustFix = topIssues.filter(c => (c.sentiment || 0) <= -0.3 && (c.share || 0) > 0.1);
      const strategic = topIssues.filter(c => (c.sentiment || 0) <= -0.3 && (c.share || 0) <= 0.1);
      
      return `**Piano d'Azione Strategico - ${projectId.toUpperCase()}**\n\n` +
        `Basandomi su ${(meta.totals?.reviews || 0).toLocaleString()} recensioni analizzate:\n\n` +
        
        `**FASE 1: Quick Wins (0-30 giorni)**\n` +
        `Impatto stimato: +${(quickWins.length * 0.15).toFixed(1)} punti sentiment\n` +
        quickWins.map(c =>
          `• ${c.label}: ${(c.strengths || [])[0] ? `Potenziare ${c.strengths[0]}` : `Migliorare processo`}\n` +
          `  - Effort: Basso | Impact: ${((c.share || 0) * 100).toFixed(0)}% utenti`
        ).join("\n") + "\n\n" +
        
        `**FASE 2: Must Fix (30-60 giorni)**\n` +
        `Impatto stimato: +${(mustFix.length * 0.25).toFixed(1)} punti sentiment\n` +
        mustFix.map(c =>
          `• ${c.label}: Risolvere ${(c.weaknesses || [])[0] || 'problemi identificati'}\n` +
          `  - Effort: Medio | Impact: ${((c.share || 0) * 100).toFixed(0)}% utenti | Urgenza: Alta`
        ).join("\n") + "\n\n" +
        
        `**FASE 3: Iniziative Strategiche (60-90 giorni)**\n` +
        strategic.map(c =>
          `• ${c.label}: Piano di miglioramento strutturale\n` +
          `  - Effort: Alto | Impact: Lungo termine`
        ).join("\n") + "\n\n" +
        
        `**KPI da Monitorare**:\n` +
        `• Sentiment Score: Target +0.3 in 90 giorni\n` +
        `• Volume recensioni negative: -40% su cluster critici\n` +
        `• NPS Score: +15 punti\n` +
        `• Retention Rate: +10%\n\n` +
        
        `**Next Step Immediato**: Iniziare con "${quickWins[0]?.label || mustFix[0]?.label}" ` +
        `per generare momentum positivo visibile in 2 settimane.`;
    }
    
    // Default response with comprehensive overview
    return `**Dashboard Analitica ${projectId.toUpperCase()}**\n\n` +
      `**Metriche Chiave:**\n` +
      `• Dataset: ${(meta.totals?.reviews || 0).toLocaleString()} recensioni\n` +
      `• Cluster identificati: ${meta.totals?.clusters || 0}\n` +
      `• Sentiment medio: ${(aggregates.sentiment_mean || 0).toFixed(2)}\n\n` +
      
      `**Top 3 Temi Positivi:**\n` +
      clusters.filter(c => (c.sentiment || 0) > 0).sort((a, b) => (b.sentiment || 0) - (a.sentiment || 0)).slice(0, 3).map((c, i) =>
        `${i + 1}. ${c.label} (+${(c.sentiment || 0).toFixed(2)})`
      ).join("\n") + "\n\n" +
      
      `**Top 3 Aree Critiche:**\n` +
      clusters.filter(c => (c.sentiment || 0) < 0).sort((a, b) => (a.sentiment || 0) - (b.sentiment || 0)).slice(0, 3).map((c, i) =>
        `${i + 1}. ${c.label} (${(c.sentiment || 0).toFixed(2)})`
      ).join("\n") + "\n\n" +
      
      `Usa i suggerimenti sopra per esplorare aspetti specifici, oppure fammi qualsiasi domanda sui dati!`;
  };

  return (
      <motion.div
        className="insightsuite-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="title-lg">AI Assistant</h2>
            <p className="text-xs text-neutral-500">
              Analizza i dati con l'intelligenza artificiale
            </p>
          </div>
        </div>

        {/* Chat Messages - Improved background with light theme support */}
        <div className="h-96 overflow-y-auto rounded-xl p-4 mb-4 border bg-neutral-800/40 border-neutral-700">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center">
                  <Bot className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">
                    Chiedimi qualsiasi cosa sui dati del progetto
                  </p>
                  <p className="text-neutral-600 text-xs mt-1">
                    Usa i suggerimenti sotto per iniziare
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      message.role === "user" 
                        ? "bg-blue-600/20 text-blue-400" 
                        : "bg-purple-600/20 text-purple-400"
                    }`}>
                      {message.role === "user" ? (
                        <UserIcon className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`flex-1 ${
                      message.role === "user" ? "text-right" : ""
                    }`}>
                      <div className="text-xs text-neutral-500 mb-1">
                        {message.role === "user" ? t('chat.you') : t('chat.assistant')}
                      </div>
                      <div className={`inline-block px-4 py-2 rounded-xl ${
                        message.role === "user"
                          ? "bg-blue-600/20 text-white"
                          : "bg-blue-600/20 text-white"
                      }`}>
                        <div className="text-sm whitespace-pre-wrap">
                          {message.text.split('\n').map((line, i) => (
                            <React.Fragment key={i}>
                              {line.startsWith('**') && line.endsWith('**') ? (
                                <strong>{line.slice(2, -2)}</strong>
                              ) : line.startsWith('• ') ? (
                                <div className="ml-4">{line}</div>
                              ) : line.startsWith('  -') || line.startsWith('   •') ? (
                                <div className="ml-8 text-neutral-400">{line}</div>
                              ) : (
                                line
                              )}
                              {i < message.text.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-blue-600/20 px-4 py-2 rounded-xl">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-neutral-500 rounded-full animate-pulse" />
                        <span className="w-2 h-2 bg-neutral-500 rounded-full animate-pulse delay-75" />
                        <span className="w-2 h-2 bg-neutral-500 rounded-full animate-pulse delay-150" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <motion.button
              key={idx}
              onClick={() => handleSend(prompt.text)}
              disabled={isLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              } ${prompt.color}`}
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              {prompt.icon}
              {prompt.text}
            </motion.button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.placeholder')}
            disabled={isLoading}
            className="input-field flex-1"
          />
          <motion.button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-primary px-6"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </form>
      </motion.div>
    );
}