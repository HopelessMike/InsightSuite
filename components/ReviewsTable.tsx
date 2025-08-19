"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Star,
  Globe,
  TrendingUp,
  TrendingDown,
  X
} from "lucide-react";
import { useAppStore } from "@/store/app";
import type { ProjectData, Cluster, Quote } from "@/lib/types";

type Row = Quote & {
  clusterLabel: string;
  clusterId: string;
  sentiment?: number;
};

type Props = {
  data?: ProjectData;
  clusters?: Cluster[];
  title?: string;
};

export default function ReviewsTable({ data, clusters = [], title = "Explorer Recensioni" }: Props) {
  const { setSelectedClusterId } = useAppStore();
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [selectedClusterFilter, setSelectedClusterFilter] = React.useState<string>("all");
  const [selectedLangFilter, setSelectedLangFilter] = React.useState<string>("all");
  const [selectedRatingFilter, setSelectedRatingFilter] = React.useState<string>("all");
  const [showFilters, setShowFilters] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Prepare all rows from clusters - VERSIONE CORRETTA
  const allRows = React.useMemo<Row[]>(() => {
    const rows: Row[] = [];
    
    // Controllo sicuro per clusters
    if (!clusters || !Array.isArray(clusters)) {
      return rows;
    }
    
    clusters.forEach(cluster => {
      // Controllo sicuro per cluster e cluster.quotes
      if (!cluster || !cluster.quotes || !Array.isArray(cluster.quotes)) {
        console.warn(`Cluster ${cluster?.id || 'unknown'} non ha quotes valide`);
        return; // Skip questo cluster
      }
      
      cluster.quotes.forEach(quote => {
        // Controllo sicuro anche per quote
        if (!quote) return;
        
        rows.push({
          ...quote,
          clusterLabel: cluster.label || 'Senza nome',
          clusterId: cluster.id || 'unknown',
          sentiment: cluster.sentiment,
        });
      });
    });
    
    return rows;
  }, [clusters]);

  // Get unique languages
  const languages = React.useMemo(() => {
    const langs = new Set(allRows.map(r => r.lang).filter(Boolean));
    return Array.from(langs).sort();
  }, [allRows]);

  // Filter rows
  const filteredRows = React.useMemo(() => {
    let filtered = [...allRows];
    
    // Search filter
    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      filtered = filtered.filter(row => {
        const searchText = `${row.text || ''} ${row.clusterLabel || ''}`.toLowerCase();
        return searchText.includes(query);
      });
    }
    
    // Cluster filter
    if (selectedClusterFilter !== "all") {
      filtered = filtered.filter(row => row.clusterId === selectedClusterFilter);
    }
    
    // Language filter
    if (selectedLangFilter !== "all") {
      filtered = filtered.filter(row => row.lang === selectedLangFilter);
    }
    
    // Rating filter
    if (selectedRatingFilter !== "all") {
      const rating = parseInt(selectedRatingFilter);
      filtered = filtered.filter(row => row.rating === rating);
    }
    
    return filtered;
  }, [allRows, debouncedQuery, selectedClusterFilter, selectedLangFilter, selectedRatingFilter]);

  const handleGoToCluster = (clusterId: string) => {
    setSelectedClusterId(clusterId);
  };

  const getSentimentIcon = (sentiment?: number) => {
    if (!sentiment && sentiment !== 0) return null;
    if (sentiment > 0.3) return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (sentiment < -0.3) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return null;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClusterFilter("all");
    setSelectedLangFilter("all");
    setSelectedRatingFilter("all");
  };

  const activeFiltersCount = [
    selectedClusterFilter !== "all",
    selectedLangFilter !== "all",
    selectedRatingFilter !== "all",
    debouncedQuery !== ""
  ].filter(Boolean).length;

  // Se non ci sono clusters validi, mostra messaggio appropriato
  const hasValidClusters = clusters && clusters.length > 0 && 
    clusters.some(c => c && c.quotes && c.quotes.length > 0);

  return (
    <motion.div
      className="insightsuite-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h2 className="title-lg">{title}</h2>
        
        {hasValidClusters && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca nel testo..."
                className="input-field pl-10 w-full sm:w-72"
              />
            </div>
            
            {/* Filter Toggle */}
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary relative ${showFilters ? "bg-neutral-700" : ""}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Filtri</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </motion.button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {hasValidClusters && (
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 p-4 bg-neutral-800/30 rounded-xl">
                {/* Cluster Filter */}
                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1 block">
                    Cluster
                  </label>
                  <select
                    value={selectedClusterFilter}
                    onChange={(e) => setSelectedClusterFilter(e.target.value)}
                    className="input-field w-full text-sm"
                  >
                    <option value="all">Tutti i cluster</option>
                    {clusters
                      .filter(cluster => cluster && cluster.quotes && cluster.quotes.length > 0)
                      .map(cluster => (
                        <option key={cluster.id} value={cluster.id}>
                          {cluster.label || 'Senza nome'}
                        </option>
                      ))}
                  </select>
                </div>
                
                {/* Language Filter */}
                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1 block">
                    Lingua
                  </label>
                  <select
                    value={selectedLangFilter}
                    onChange={(e) => setSelectedLangFilter(e.target.value)}
                    className="input-field w-full text-sm"
                  >
                    <option value="all">Tutte le lingue</option>
                    {languages.map(lang => (
                      <option key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Rating Filter */}
                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1 block">
                    Rating
                  </label>
                  <select
                    value={selectedRatingFilter}
                    onChange={(e) => setSelectedRatingFilter(e.target.value)}
                    className="input-field w-full text-sm"
                  >
                    <option value="all">Tutti i rating</option>
                    {[5, 4, 3, 2, 1].map(rating => (
                      <option key={rating} value={rating}>
                        {"⭐".repeat(rating)} ({rating})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Clear Filters */}
                <div className="flex items-end">
                  <motion.button
                    onClick={clearFilters}
                    className="btn-ghost w-full justify-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reset
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Results count */}
      {hasValidClusters && allRows.length > 0 && (
        <div className="text-sm text-neutral-500 mb-3">
          Mostrando {filteredRows.length} di {allRows.length} recensioni
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        {!hasValidClusters ? (
          <div className="p-12 text-center">
            <div className="text-neutral-500 mb-2">
              Nessuna recensione disponibile
            </div>
            <div className="text-sm text-neutral-600">
              I dati delle recensioni verranno visualizzati qui quando disponibili
            </div>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Testo</th>
                <th className="px-4 py-3 font-medium">Cluster</th>
                <th className="px-4 py-3 font-medium text-center">Sent.</th>
                <th className="px-4 py-3 font-medium text-center">Lingua</th>
                <th className="px-4 py-3 font-medium text-center">Rating</th>
                <th className="px-4 py-3 font-medium text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                    Nessuna recensione trovata con i filtri selezionati
                  </td>
                </tr>
              ) : (
                filteredRows.slice(0, 100).map((row, idx) => (
                  <motion.tr
                    key={`${row.clusterId}-${idx}`}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.01, 0.5) }}
                  >
                    <td className="px-4 py-3 max-w-md">
                      <div className="truncate" title={row.text || ''}>
                        {highlightText(row.text || '', debouncedQuery)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge">
                        {row.clusterLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getSentimentIcon(row.sentiment)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Globe className="w-3 h-3" />
                        {(row.lang || 'N/A').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.rating ? (
                        <span className="inline-flex items-center gap-1 text-yellow-400">
                          <Star className="w-3 h-3 fill-current" />
                          {row.rating}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <motion.button
                        onClick={() => handleGoToCluster(row.clusterId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Vai al cluster
                        <ChevronRight className="w-3 h-3" />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {hasValidClusters && filteredRows.length > 100 && (
        <div className="text-center text-sm text-neutral-500 mt-3">
          Mostrando i primi 100 risultati. Usa i filtri per affinare la ricerca.
        </div>
      )}
    </motion.div>
  );
}

// Helper function to highlight search text
function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text || '';
  
  try {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400/30 text-yellow-200 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch (error) {
    console.error('Error highlighting text:', error);
    return text;
  }
}