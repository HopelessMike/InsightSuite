"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  ChevronRight,
  ChevronLeft,
  Star,
  Globe,
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useAppStore } from "@/store/app";
import { useLocale } from "@/lib/i18n";
import type { Cluster } from "@/lib/types";

type Review = {
  id: string;
  text: string;
  clusterId: string | null;
  clusterLabel: string | null;
  sentiment: number;
  lang: string;
  date: string | null;
  rating: number | null;
  sourceId: string;
  projectId: string;
};

type ReviewPage = {
  total: number;
  page: number;
  pageSize: number;
  items: Review[];
};

type Props = {
  data?: any;
  clusters?: Cluster[];
  title?: string;
};

export default function ReviewsTable({ data, clusters = [], title }: Props) {
  const { setSelectedClusterId, selectedProject } = useAppStore();
  const { t } = useLocale();
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClusterFilter, setSelectedClusterFilter] = React.useState<string>("all");
  const [selectedLangFilter, setSelectedLangFilter] = React.useState<string>("all");
  const [selectedRatingFilter, setSelectedRatingFilter] = React.useState<string>("all");
  const [showFilters, setShowFilters] = React.useState(false);
  const [sortField, setSortField] = React.useState<"date" | "sentiment" | "rating">("date");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(50);
  
  const [reviews, setReviews] = React.useState<ReviewPage | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch reviews from API
  React.useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          projectId: selectedProject,
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
          sort: sortField,
          order: sortOrder,
        });
        
        if (searchQuery) params.append('q', searchQuery);
        if (selectedClusterFilter !== "all") params.append('clusterId', selectedClusterFilter);
        if (selectedLangFilter !== "all") params.append('lang', selectedLangFilter);
        if (selectedRatingFilter !== "all") {
          params.append('ratingMin', selectedRatingFilter);
          params.append('ratingMax', selectedRatingFilter);
        }
        
        // risolve in  /InsightSuite/api/reviews?...  grazie al basePath
        const response = await fetch(`api/reviews?${params.toString()}`, { cache: "no-store" });

        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setReviews(data);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('Failed to load reviews. Please try again.');
        // Fallback to empty data
        setReviews({
          total: 0,
          page: currentPage,
          pageSize: pageSize,
          items: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      fetchReviews();
    }, searchQuery ? 300 : 0);
    
    return () => clearTimeout(timer);
  }, [selectedProject, currentPage, pageSize, searchQuery, selectedClusterFilter, 
      selectedLangFilter, selectedRatingFilter, sortField, sortOrder]);

  // Get unique languages from current data
  const languages = React.useMemo(() => {
    if (!reviews) return [];
    const langs = new Set(reviews.items.map(r => r.lang).filter(Boolean));
    return Array.from(langs).sort();
  }, [reviews]);

  const handleGoToCluster = (clusterId: string | null) => {
    if (clusterId) {
      setSelectedClusterId(clusterId);
    }
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.3) return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (sentiment < -0.3) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return null;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClusterFilter("all");
    setSelectedLangFilter("all");
    setSelectedRatingFilter("all");
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    selectedClusterFilter !== "all",
    selectedLangFilter !== "all",
    selectedRatingFilter !== "all",
    searchQuery !== ""
  ].filter(Boolean).length;

  const totalPages = reviews ? Math.ceil(reviews.total / pageSize) : 1;

  return (
    <motion.div
      className="insightsuite-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h2 className="title-lg">{title || t('reviews.title')}</h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search with proper spacing - FIX 2 */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('reviews.search')}
              className="input-field w-full sm:w-72"
              style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
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
            <span className="hidden sm:inline ml-2">{t('reviews.filters')}</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4 p-4 bg-neutral-800/30 rounded-xl">
              {/* Cluster Filter */}
              <div>
                <label className="text-xs font-medium text-neutral-400 mb-1 block">
                  Cluster
                </label>
                <select
                  value={selectedClusterFilter}
                  onChange={(e) => {
                    setSelectedClusterFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input-field w-full text-sm"
                >
                  <option value="all">All clusters</option>
                  {clusters.map(cluster => (
                    <option key={cluster.id} value={cluster.id}>
                      {cluster.label || 'No name'}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Language Filter */}
              <div>
                <label className="text-xs font-medium text-neutral-400 mb-1 block">
                  Language
                </label>
                <select
                  value={selectedLangFilter}
                  onChange={(e) => {
                    setSelectedLangFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input-field w-full text-sm"
                >
                  <option value="all">All languages</option>
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
                  onChange={(e) => {
                    setSelectedRatingFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input-field w-full text-sm"
                >
                  <option value="all">All ratings</option>
                  {[5, 4, 3, 2, 1].map(rating => (
                    <option key={rating} value={rating}>
                      {"⭐".repeat(rating)} ({rating})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Sort */}
              <div>
                <label className="text-xs font-medium text-neutral-400 mb-1 block">
                  Sort by
                </label>
                <select
                  value={`${sortField}_${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('_');
                    setSortField(field as any);
                    setSortOrder(order as any);
                    setCurrentPage(1);
                  }}
                  className="input-field w-full text-sm"
                >
                  <option value="date_desc">Date (newest)</option>
                  <option value="date_asc">Date (oldest)</option>
                  <option value="sentiment_desc">Sentiment (high)</option>
                  <option value="sentiment_asc">Sentiment (low)</option>
                  <option value="rating_desc">Rating (high)</option>
                  <option value="rating_asc">Rating (low)</option>
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

      {/* Results count */}
      {reviews && (
        <div className="text-sm text-neutral-500 mb-3">
          {t('reviews.showing', { current: reviews.items.length, total: reviews.total })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
            <div className="text-neutral-500">{t('reviews.loading')}</div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <div className="text-neutral-500 mb-2">{t('reviews.error')}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-secondary"
            >
              {t('reviews.retry')}
            </button>
          </div>
        ) : !reviews || reviews.items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-neutral-500 mb-2">
              {t('reviews.noResults')}
            </div>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="btn-secondary">
                {t('reviews.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-neutral-800/90 backdrop-blur-sm border-b border-neutral-700">
              <tr>
                <th className="px-4 py-3 font-medium">{t('reviews.columns.text')}</th>
                <th className="px-4 py-3 font-medium">{t('reviews.columns.cluster')}</th>
                <th className="px-4 py-3 font-medium text-center">{t('reviews.columns.sentiment')}</th>
                <th className="px-4 py-3 font-medium text-center">{t('reviews.columns.language')}</th>
                <th className="px-4 py-3 font-medium text-center">{t('reviews.columns.rating')}</th>
                <th className="px-4 py-3 font-medium text-center">{t('reviews.columns.date')}</th>
                <th className="px-4 py-3 font-medium text-center">{t('reviews.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.items.map((review, idx) => (
                <motion.tr
                  key={review.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx * 0.01, 0.5) }}
                >
                  <td className="px-4 py-3 max-w-md">
                    <div className="truncate" title={review.text}>
                      {highlightText(review.text, searchQuery)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {review.clusterLabel && (
                      <span className="badge">
                        {review.clusterLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getSentimentIcon(review.sentiment)}
                      <span className={`text-xs ${
                        review.sentiment > 0.3 ? 'text-green-400' :
                        review.sentiment < -0.3 ? 'text-red-400' :
                        'text-neutral-400'
                      }`}>
                        {review.sentiment.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Globe className="w-3 h-3" />
                      {review.lang.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {review.rating ? (
                      <span className="inline-flex items-center gap-1 text-yellow-400">
                        <Star className="w-3 h-3 fill-current" />
                        {review.rating}
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {review.date ? (
                      <span className="text-xs text-neutral-400">
                        {new Date(review.date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {review.clusterId && (
                      <motion.button
                        onClick={() => handleGoToCluster(review.clusterId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t('reviews.viewCluster')}
                        <ChevronRight className="w-3 h-3" />
                      </motion.button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination */}
      {reviews && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-neutral-500">
            {t('reviews.page', { current: currentPage, total: totalPages })}
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-secondary px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={currentPage > 1 ? { scale: 1.02 } : {}}
              whileTap={currentPage > 1 ? { scale: 0.98 } : {}}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <motion.button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded text-sm ${
                      currentPage === pageNum 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {pageNum}
                  </motion.button>
                );
              })}
            </div>
            
            <motion.button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={currentPage < totalPages ? { scale: 1.02 } : {}}
              whileTap={currentPage < totalPages ? { scale: 0.98 } : {}}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
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