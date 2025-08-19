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
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const simulateStreaming = async (text: string, onUpdate: (partial: string) => void) => {
    const words = text.split(" ");
    let accumulated = "";
    
    for (let i = 0; i < words.length; i++) {
      accumulated += (i > 0 ? " " : "") + words[i];
      onUpdate(accumulated);
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));
    }
  };

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
      // Simulate API call with context
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate contextual response based on data
      const response = generateContextualResponse(question, data);
      
      // Add empty assistant message
      const assistantMessage: Message = {
        role: "assistant",
        text: "",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Simulate streaming
      await simulateStreaming(response, (partial) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = partial;
          return updated;
        });
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Mi dispiace, si è verificato un errore. Riprova più tardi.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const generateContextualResponse = (question: string, data?: ProjectData): string => {
    if (!data) {
      return "I dati del progetto non sono ancora caricati. Attendi qualche istante e riprova.";
    }
    
    const q = question.toLowerCase();
    
    // Cluster peggiorando
    if (q.includes("peggior") || q.includes("trend negativ")) {
      const negativeClusters = data.clusters
        .filter(c => c.sentiment < -0.3)
        .slice(0, 3);
      
      if (negativeClusters.length > 0) {
        return `Ho identificato ${negativeClusters.length} cluster con trend negativi:\n\n` +
          negativeClusters.map((c, i) => 
            `${i + 1}. **${c.label}** (sentiment: ${c.sentiment.toFixed(2)})\n` +
            `   Share: ${(c.share * 100).toFixed(1)}%\n` +
            `   Keywords: ${c.keywords.slice(0, 3).join(", ")}`
          ).join("\n\n") +
          "\n\nTi consiglio di prioritizzare interventi su questi temi per migliorare l'esperienza complessiva.";
      }
      return "Non ho identificato cluster con trend particolarmente negativi nel periodo analizzato.";
    }
    
    // Temi critici
    if (q.includes("critici") || q.includes("problemi")) {
      const criticalClusters = data.clusters
        .sort((a, b) => b.opportunity_score - a.opportunity_score)
        .slice(0, 3);
      
      return `Ecco i 3 temi più critici basati sull'opportunity score:\n\n` +
        criticalClusters.map((c, i) => 
          `${i + 1}. **${c.label}**\n` +
          `   Opportunity Score: ${c.opportunity_score.toFixed(2)}\n` +
          `   Impatto: ${(c.share * 100).toFixed(1)}% degli utenti\n` +
          `   Principali criticità: ${c.weaknesses.slice(0, 2).join(", ")}`
        ).join("\n\n");
    }
    
    // Driver sentiment negativo
    if (q.includes("driver") || q.includes("sentiment negativ")) {
      const negativeDrivers = data.clusters
        .filter(c => c.sentiment < 0)
        .sort((a, b) => (a.sentiment * a.share) - (b.sentiment * b.share))
        .slice(0, 3);
      
      return `I principali driver del sentiment negativo sono:\n\n` +
        negativeDrivers.map(c => 
          `• **${c.label}**: ${c.weaknesses[0] || "Problematiche generali"}`
        ).join("\n") +
        "\n\nQuesti temi impattano complessivamente il " +
        `${(negativeDrivers.reduce((sum, c) => sum + c.share, 0) * 100).toFixed(0)}% degli utenti.`;
    }
    
    // Azioni prioritarie
    if (q.includes("azioni") || q.includes("priorit") || q.includes("suggerisci")) {
      const topIssues = data.clusters
        .sort((a, b) => b.opportunity_score - a.opportunity_score)
        .slice(0, 3);
      
      return `Basandomi sull'analisi, suggerisco queste azioni prioritarie:\n\n` +
        `🎯 **Quick Wins** (alto impatto, facile implementazione):\n` +
        topIssues.filter(c => c.sentiment > -0.3 && c.share > 0.1).map(c =>
          `• Migliorare ${c.label.toLowerCase()}`
        ).join("\n") + "\n\n" +
        `🔴 **Must Fix** (critici da risolvere subito):\n` +
        topIssues.filter(c => c.sentiment <= -0.3 && c.share > 0.1).map(c =>
          `• Risolvere problemi in ${c.label.toLowerCase()}`
        ).join("\n") + "\n\n" +
        `📊 Consiglio di monitorare costantemente questi KPI per misurare i progressi.`;
    }
    
    // Default response
    return `Analizzando il dataset ${projectId}, ho ${data.meta.totals.reviews.toLocaleString()} recensioni ` +
      `organizzate in ${data.meta.totals.clusters} cluster tematici. ` +
      `Il sentiment medio è ${data.aggregates.sentiment_mean.toFixed(2)}. ` +
      `Posso aiutarti ad approfondire aspetti specifici - prova a chiedermi dei trend negativi, ` +
      `dei temi critici o delle azioni prioritarie da intraprendere.`;
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

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto rounded-xl bg-neutral-900/50 border border-neutral-800 p-4 mb-4">
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
                    Usa i suggerimenti sopra per iniziare
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
                        {message.role === "user" ? "Tu" : "Assistant"}
                      </div>
                      <div className={`inline-block px-4 py-2 rounded-xl ${
                        message.role === "user"
                          ? "bg-blue-600/20 text-white"
                          : "bg-neutral-800/50 text-neutral-200"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">
                          {message.text}
                        </p>
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
                    <div className="bg-neutral-800/50 px-4 py-2 rounded-xl">
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

        {/* Quick Prompts - Moved here, above input */}
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
            placeholder="Scrivi una domanda..."
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