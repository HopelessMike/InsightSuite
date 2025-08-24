"use client";

import * as React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Translations
const translations = {
  en: {
    // App
    "app.name": "InsightSuite",
    "app.loading": "Loading...",
    "app.error": "Error loading data",
    
    // Header
    "header.project": "Project: {{name}} • Source: {{source}}",
    "header.themeToggle": "Toggle theme",
    "header.languageToggle": "Change language",
    
    // Datasets
    "datasets.airbnb": "Airbnb",
    "datasets.mobile": "Mobile App",
    "datasets.ecommerce": "E-Commerce",
    
    // KPIs
    "kpi.totalReviews": "Total Reviews",
    "kpi.clustersIdentified": "{{n}} clusters identified",
    "kpi.avgSentiment": "Avg Sentiment",
    "kpi.avgScale": "Scale -1 to +1",
    "kpi.personas": "Personas",
    "kpi.segments": "User segments",
    "kpi.topThemes": "Top Themes",
    
    // Charts
    "charts.themesMap": "Themes Distribution",
    "charts.themesLegend": "Size = volume • Color = sentiment",
    "charts.opportunityMatrix": "Opportunity Matrix",
    "charts.trends.title": "Temporal Trends",
    "charts.trends.sentimentOverTime": "Sentiment Over Time",
    "charts.trends.volumeOverTime": "Review Volume",
    "charts.trends.topClusterTrends": "Top Themes Evolution",
    
    // Opportunity Matrix
    "matrix.quickWins": "Quick Wins",
    "matrix.mustFix": "Must Fix",
    "matrix.monitor": "Monitor",
    "matrix.strategic": "Strategic",
    "matrix.quickWinsDesc": "High impact, easy fix",
    "matrix.mustFixDesc": "Critical issues",
    "matrix.monitorDesc": "Low impact",
    "matrix.strategicDesc": "High negativity",
    
    // Personas
    "personas.title": "User Personas",
    "personas.goals": "Goals",
    "personas.painPoints": "Pain Points",
    "personas.quotes": "Typical Quotes",
    "personas.channels": "Preferred Channels",
    "personas.share": "{{share}}% of users",
    
    // Reviews
    "reviews.title": "Review Explorer",
    "reviews.search": "Search in text...",
    "reviews.filters": "Filters",
    "reviews.showing": "Showing {{current}} of {{total}} reviews",
    "reviews.noResults": "No reviews found",
    "reviews.clearFilters": "Clear filters",
    "reviews.cluster": "Cluster",
    "reviews.allClusters": "All clusters",
    "reviews.language": "Language",
    "reviews.allLanguages": "All languages",
    "reviews.rating": "Rating",
    "reviews.allRatings": "All ratings",
    "reviews.sortBy": "Sort by",
    "reviews.date": "Date",
    "reviews.sentiment": "Sentiment",
    "reviews.newest": "Newest first",
    "reviews.oldest": "Oldest first",
    "reviews.highSentiment": "Positive first",
    "reviews.lowSentiment": "Negative first",
    "reviews.highRating": "High rating",
    "reviews.lowRating": "Low rating",
    "reviews.reset": "Reset",
    "reviews.viewCluster": "View cluster",
    "reviews.text": "Text",
    "reviews.actions": "Actions",
    "reviews.loading": "Loading reviews...",
    "reviews.error": "Failed to load reviews",
    "reviews.retry": "Retry",
    "reviews.page": "Page {{current}} of {{total}}",
    
    // Table headers
    "reviews.columns.text": "Text",
    "reviews.columns.cluster": "Cluster", 
    "reviews.columns.sentiment": "Sent.",
    "reviews.columns.language": "Lang",
    "reviews.columns.rating": "Rating",
    "reviews.columns.date": "Date",
    "reviews.columns.actions": "Actions",
    
    // Chat
    "chat.title": "AI Assistant",
    "chat.subtitle": "Analyze data with artificial intelligence",
    "chat.placeholder": "Ask a question...",
    "chat.emptyState": "Ask me anything about the project data",
    "chat.hint": "Use the suggestions above to start",
    "chat.you": "You",
    "chat.assistant": "Assistant",
    "chat.send": "Send",
    
    // Chat prompts
    "prompts.declining": "Which clusters are declining over time?",
    "prompts.critical": "Show me the 3 most critical themes",
    "prompts.drivers": "What drives negative sentiment?",
    "prompts.actions": "Suggest priority actions",
    
    // Cluster Detail
    "cluster.reviews": "reviews",
    "cluster.share": "share",
    "cluster.opportunity": "Opportunity",
    "cluster.trend": "Trend",
    "cluster.temporalTrend": "Temporal Trend",
    "cluster.keywords": "Keywords",
    "cluster.aiSummary": "AI Summary",
    "cluster.strengths": "Strengths",
    "cluster.weaknesses": "Critical Issues",
    "cluster.representativeQuotes": "Representative Quotes",
    "cluster.exportReport": "Export Report",
    "cluster.addToStoryboard": "Add to Storyboard",
    
    // Methodology
    "methodology.title": "Methodology & Attribution",
    "methodology.subtitle": "How InsightSuite works",
    "methodology.dataCollection": "Data Collection & Processing",
    "methodology.aiAnalysis": "AI-Powered Analysis",
    "methodology.privacy": "Privacy & Ethics",
    "methodology.techStack": "Tech Stack",
    "methodology.datasetAttribution": "Dataset Attribution",
    "methodology.demoNote": "This is a demo with public data. In production, InsightSuite integrates with your business data sources while respecting all privacy and compliance requirements.",
    
    // Common
    "common.close": "Close",
    "common.copied": "Copied!",
    "common.noData": "No data available",
    "common.noDataDesc": "Data will appear here when available",
  },
  
  it: {
    // App
    "app.name": "InsightSuite",
    "app.loading": "Caricamento...",
    "app.error": "Errore nel caricamento dei dati",
    
    // Header
    "header.project": "Progetto: {{name}} • Fonte: {{source}}",
    "header.themeToggle": "Cambia tema",
    "header.languageToggle": "Cambia lingua",
    
    // Datasets
    "datasets.airbnb": "Airbnb",
    "datasets.mobile": "App Mobile",
    "datasets.ecommerce": "E-Commerce",
    
    // KPIs
    "kpi.totalReviews": "Recensioni Totali",
    "kpi.clustersIdentified": "{{n}} cluster identificati",
    "kpi.avgSentiment": "Sentiment Medio",
    "kpi.avgScale": "Scala da -1 a +1",
    "kpi.personas": "Personas",
    "kpi.segments": "Segmenti utente",
    "kpi.topThemes": "Temi Principali",
    
    // Charts
    "charts.themesMap": "Distribuzione Temi",
    "charts.themesLegend": "Dimensione = volume • Colore = sentiment",
    "charts.opportunityMatrix": "Matrice Opportunità",
    "charts.trends.title": "Trend Temporali",
    "charts.trends.sentimentOverTime": "Sentiment nel Tempo",
    "charts.trends.volumeOverTime": "Volume Recensioni",
    "charts.trends.topClusterTrends": "Evoluzione Temi Principali",
    
    // Opportunity Matrix
    "matrix.quickWins": "Quick Wins",
    "matrix.mustFix": "Must Fix",
    "matrix.monitor": "Osservare",
    "matrix.strategic": "Strategici",
    "matrix.quickWinsDesc": "Alto impatto, facile fix",
    "matrix.mustFixDesc": "Criticità urgenti",
    "matrix.monitorDesc": "Basso impatto",
    "matrix.strategicDesc": "Alta negatività",
    
    // Personas
    "personas.title": "Personas Utente",
    "personas.goals": "Obiettivi",
    "personas.painPoints": "Pain Points",
    "personas.quotes": "Citazioni Tipiche",
    "personas.channels": "Canali Preferiti",
    "personas.share": "{{share}}% degli utenti",
    
    // Reviews
    "reviews.title": "Esplora Recensioni",
    "reviews.search": "Cerca nel testo...",
    "reviews.filters": "Filtri",
    "reviews.showing": "Mostrando {{current}} di {{total}} recensioni",
    "reviews.noResults": "Nessuna recensione trovata",
    "reviews.clearFilters": "Rimuovi filtri",
    "reviews.cluster": "Cluster",
    "reviews.allClusters": "Tutti i cluster",
    "reviews.language": "Lingua",
    "reviews.allLanguages": "Tutte le lingue",
    "reviews.rating": "Valutazione",
    "reviews.allRatings": "Tutte le valutazioni",
    "reviews.sortBy": "Ordina per",
    "reviews.date": "Data",
    "reviews.sentiment": "Sentiment",
    "reviews.newest": "Più recenti",
    "reviews.oldest": "Meno recenti",
    "reviews.highSentiment": "Più positivi",
    "reviews.lowSentiment": "Più negativi",
    "reviews.highRating": "Valutazione alta",
    "reviews.lowRating": "Valutazione bassa",
    "reviews.reset": "Reset",
    "reviews.viewCluster": "Vai al cluster",
    "reviews.text": "Testo",
    "reviews.actions": "Azioni",
    "reviews.loading": "Caricamento recensioni...",
    "reviews.error": "Errore nel caricamento",
    "reviews.retry": "Riprova",
    "reviews.page": "Pagina {{current}} di {{total}}",
    
    // Table headers
    "reviews.columns.text": "Testo",
    "reviews.columns.cluster": "Cluster", 
    "reviews.columns.sentiment": "Sent.",
    "reviews.columns.language": "Lingua",
    "reviews.columns.rating": "Voto",
    "reviews.columns.date": "Data",
    "reviews.columns.actions": "Azioni",
    
    // Chat
    "chat.title": "Assistente AI",
    "chat.subtitle": "Analizza i dati con l'intelligenza artificiale",
    "chat.placeholder": "Scrivi una domanda...",
    "chat.emptyState": "Chiedimi qualsiasi cosa sui dati del progetto",
    "chat.hint": "Usa i suggerimenti sopra per iniziare",
    "chat.you": "Tu",
    "chat.assistant": "Assistente",
    "chat.send": "Invia",
    
    // Chat prompts
    "prompts.declining": "Quali cluster stanno peggiorando nel tempo?",
    "prompts.critical": "Mostrami i 3 temi più critici",
    "prompts.drivers": "Quali sono i driver del sentiment negativo?",
    "prompts.actions": "Suggerisci azioni prioritarie",
    
    // Cluster Detail
    "cluster.reviews": "recensioni",
    "cluster.share": "quota",
    "cluster.opportunity": "Opportunità",
    "cluster.trend": "Trend",
    "cluster.temporalTrend": "Trend Temporale",
    "cluster.keywords": "Parole Chiave",
    "cluster.aiSummary": "Riassunto AI",
    "cluster.strengths": "Punti di Forza",
    "cluster.weaknesses": "Criticità",
    "cluster.representativeQuotes": "Citazioni Rappresentative",
    "cluster.exportReport": "Esporta Report",
    "cluster.addToStoryboard": "Aggiungi a Storyboard",
    
    // Methodology
    "methodology.title": "Metodologia & Attribution",
    "methodology.subtitle": "Come funziona InsightSuite",
    "methodology.dataCollection": "Raccolta e Elaborazione Dati",
    "methodology.aiAnalysis": "Analisi con AI",
    "methodology.privacy": "Privacy ed Etica",
    "methodology.techStack": "Stack Tecnologico",
    "methodology.datasetAttribution": "Attribution Dataset",
    "methodology.demoNote": "Questa è una demo con dati pubblici. In produzione, InsightSuite si integra con le tue fonti dati aziendali rispettando tutti i requisiti di privacy e compliance.",
    
    // Common
    "common.close": "Chiudi",
    "common.copied": "Copiato!",
    "common.noData": "Nessun dato disponibile",
    "common.noDataDesc": "I dati verranno visualizzati qui quando disponibili",
  }
};

// Store for locale
interface LocaleStore {
  locale: 'en' | 'it';
  setLocale: (locale: 'en' | 'it') => void;
}

const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: 'it',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'insightsuite-locale',
    }
  )
);

// Hook
export function useLocale() {
  const { locale, setLocale } = useLocaleStore();
  
  const t = React.useCallback((key: string, params?: Record<string, any>) => {
    let text = translations[locale][key as keyof typeof translations['en']] || key;
    
    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    
    return text;
  }, [locale]);
  
  return { locale, setLocale, t };
}