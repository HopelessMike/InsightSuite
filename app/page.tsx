"use client";

import * as React from "react";
import { withBase } from "@/lib/basePath";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app";
import ThemesTreemap from "@/components/ThemesTreemap";
import OpportunityMatrix from "@/components/OpportunityMatrix";
import PersonaCard from "@/components/PersonaCard";
import ReviewsTable from "@/components/ReviewsTable";
import MethodologyDrawer from "@/components/MethodologyDrawer";
import InsightChat from "@/components/InsightChat";
import StatCard from "@/components/StatCard";
import ClusterDetail from "@/components/ClusterDetail";
import LocaleToggle from "@/components/LocaleToggle";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Database,
  TrendingUp,
  Users,
  BarChart3,
  Sparkles,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLocale } from "@/lib/i18n";
import type { ProjectData, Persona } from "@/lib/types";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type TabKey = "airbnb" | "mobile" | "ecommerce";

const PROJECT_FILES: Record<TabKey, string> = {
  airbnb: withBase("/demo/projects/airbnb.json"),
  mobile: withBase("/demo/projects/mobile.json"),
  ecommerce: withBase("/demo/projects/ecommerce.json"),
};

export default function InsightSuitePage() {
  const { t, locale } = useLocale();
  const [mounted, setMounted] = React.useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = React.useState(true);
  const { theme, setTheme } = useTheme();
  const {
    selectedProject,
    projectData,
    isLoading,
    selectedClusterId,
    setSelectedProject,
    setProjectData,
    setIsLoading,
  } = useAppStore();

  React.useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0); // Aggiunto scroll to top
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      // Only show loading screen on initial load
      if (!initialLoadComplete) {
        setShowLoadingScreen(true);
      } else {
        setIsLoading(true);
        // Scroll to top when project changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      // Start timing for minimum loading duration
      const startTime = Date.now();
      const minLoadingTime = initialLoadComplete ? 250 : 3500; // 3.5 seconds for initial load
      
      await new Promise((r) => setTimeout(r, initialLoadComplete ? 250 : 100));
      try {
        const res = await fetch(PROJECT_FILES[selectedProject as TabKey], {
          cache: "no-store",
        });
        const data = (await res.json()) as ProjectData;
        if (!cancelled) setProjectData(data);
      } catch (e) {
        console.error("Failed to load project:", e);
        if (!cancelled) setProjectData(null);
      }
      
      // Ensure minimum loading time has passed
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise((r) => setTimeout(r, remainingTime));
      }
      
      if (!cancelled) {
        if (!initialLoadComplete) {
          setInitialLoadComplete(true);
        }
        setIsLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [selectedProject, setIsLoading, setProjectData, initialLoadComplete]);

  const clusters = projectData?.clusters ?? [];
  const selectedCluster =
    clusters.find((c) => c.id === selectedClusterId) || null;

  const topThemes = React.useMemo(() => {
    return [...clusters].sort((a, b) => b.share - a.share).slice(0, 3);
  }, [clusters]);

  // Calculate trends from timeseries data
  const trends = React.useMemo(() => {
    const timeseries = projectData?.timeseries?.monthly;
    if (!timeseries || timeseries.length < 2) {
      return { reviewsTrend: null, sentimentTrend: null };
    }

    // Get last two months for comparison
    const lastMonth = timeseries[timeseries.length - 1];
    const prevMonth = timeseries[timeseries.length - 2];
    
    // Calculate volume trend
    const volumeChange = lastMonth.volume - prevMonth.volume;
    const volumePercent = prevMonth.volume > 0 ? (volumeChange / prevMonth.volume) * 100 : 0;
    
    // Calculate sentiment trend
    const sentimentChange = lastMonth.sentiment_mean - prevMonth.sentiment_mean;
    
    return {
      reviewsTrend: volumePercent !== 0 ? {
        value: volumePercent > 0 ? `+${volumePercent.toFixed(1)}%` : `${volumePercent.toFixed(1)}%`,
        isPositive: volumePercent > 0,
        isZero: false
      } : null,
      sentimentTrend: Math.abs(sentimentChange) > 0.01 ? {
        value: sentimentChange > 0 ? `+${sentimentChange.toFixed(2)}` : `${sentimentChange.toFixed(2)}`,
        isPositive: sentimentChange > 0,
        isZero: false
      } : null
    };
  }, [projectData?.timeseries?.monthly]);

  if (!mounted) return null;

  const datasetName = (key: TabKey) => t(`datasets.${key}`);

  // Show loading screen on initial load
  if (showLoadingScreen && !initialLoadComplete) {
    return (
      <LoadingScreen
        progress={100}
        isVisible={true}
        onLoadingComplete={() => setShowLoadingScreen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="title-xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                  {t("app.name")}
                </h1>
                <p className="insightsuite-muted text-sm">
                  {t("header.project", {
                    name: datasetName(selectedProject as TabKey),
                    source: projectData?.meta?.source || t("app.loading"),
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Dataset Switcher */}
              <div className="flex gap-1 p-1 rounded-full bg-neutral-800/50 backdrop-blur-sm">
                {(["airbnb", "mobile", "ecommerce"] as TabKey[]).map((key) => (
                  <motion.button
                    key={key}
                    onClick={() => setSelectedProject(key)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                      selectedProject === key
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-700/50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {datasetName(key)}
                  </motion.button>
                ))}
              </div>

              {/* Language Toggle */}
              <LocaleToggle />

              {/* Theme Toggle */}
              <motion.button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2.5 rounded-full bg-neutral-800/50 backdrop-blur-sm hover:bg-neutral-700/50 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={t("header.themeToggle")}
                title={t("header.themeToggle")}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-600" />
                )}
              </motion.button>
            </div>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingSkeleton key="loading" />
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Database className="w-5 h-5" />}
                  title={t("kpi.totalReviews")}
                  value={
                    projectData?.meta?.totals?.reviews?.toLocaleString() ?? "—"
                  }
                  subtitle={t("kpi.clustersIdentified", {
                    n: projectData?.meta?.totals?.clusters ?? 0,
                  })}
                  trend={trends.reviewsTrend?.value}
                  trendUp={trends.reviewsTrend?.isPositive}
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  title={t("kpi.avgSentiment")}
                  value={
                    projectData?.aggregates?.sentiment_mean !== undefined
                      ? projectData.aggregates.sentiment_mean.toFixed(2)
                      : "—"
                  }
                  subtitle={t("kpi.avgScale")}
                  trend={trends.sentimentTrend?.value}
                  trendUp={trends.sentimentTrend?.isPositive}
                />
                <StatCard
                  icon={<Users className="w-5 h-5" />}
                  title={t("kpi.personas")}
                  value={projectData?.personas?.length ?? "—"}
                  subtitle={t("kpi.segments")}
                />
                <div className="insightsuite-card insightsuite-card-hover h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h3 className="title-card">{t("kpi.topThemes")}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topThemes.map((cluster, idx) => (
                      <motion.span
                        key={cluster.id}
                        className="badge"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        title={cluster.label}
                      >
                        <span className="break-words line-clamp-2 text-left leading-tight">
                          {cluster.label}
                        </span>
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>


              {/* Fix 7: Trends Section moved up */}
              {projectData?.timeseries?.monthly && projectData.timeseries.monthly.length > 0 && (
                <div className="insightsuite-card">
                  <h2 className="title-lg mb-4">{t("charts.trends.title")}</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[260px]">
                      <div className="text-sm font-medium mb-2">
                        {t("charts.trends.sentimentOverTime")}
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projectData.timeseries.monthly}>
                          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                          <YAxis
                            domain={[-1, 1]}
                            tick={{ fill: "#a3a3a3", fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#171717",
                              border: "1px solid #404040",
                              borderRadius: "8px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="sentiment_mean"
                            stroke="#3b82f6"
                            dot={false}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-[260px]">
                      <div className="text-sm font-medium mb-2">
                        {t("charts.trends.volumeOverTime")}
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectData.timeseries.monthly}>
                          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                          <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#171717",
                              border: "1px solid #404040",
                              borderRadius: "8px",
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="volume" 
                            stroke="#22c55e"
                            fill="#22c55e"
                            fillOpacity={0.3}
                            strokeWidth={2} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <div className="insightsuite-card insightsuite-card-hover h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="title-lg">{t("charts.themesMap")}</h2>
                      <span className="text-xs text-neutral-500">
                        {t("charts.themesLegend")}
                      </span>
                    </div>
                    <ThemesTreemap clusters={clusters} />
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="insightsuite-card insightsuite-card-hover h-full">
                    <h2 className="title-lg mb-4">
                      {t("charts.opportunityMatrix")}
                    </h2>
                    <OpportunityMatrix clusters={clusters} />
                  </div>
                </div>
              </div>

              {/* Personas */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h2 className="title-lg">{t("personas.title")}</h2>
                </div>
                {projectData?.personas && projectData.personas.length > 3 ? (
                  <PersonasScrollContainer personas={projectData.personas} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectData?.personas?.map((persona, idx) => (
                      <motion.div key={persona.id} whileHover={{ y: -4, scale: 1.02 }}>
                        <PersonaCard persona={persona} index={idx} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviews Table */}
              <ReviewsTable
                data={projectData || undefined}
                clusters={clusters}
                title={t("reviews.title")}
              />

              {/* AI Chat */}
              <InsightChat
                data={projectData || undefined}
                projectId={selectedProject as TabKey}
              />

              {/* Footer */}
              <div className="flex justify-center pt-8 pb-4">
                <MethodologyDrawer />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cluster Detail Sheet */}
        <ClusterDetail cluster={selectedCluster} />
      </div>
    </div>
  );
}

// Personas Scroll Container Component
function PersonasScrollContainer({ personas }: { personas: Persona[] }) {
  const [scrollState, setScrollState] = React.useState({
    canScrollLeft: false,
    canScrollRight: true
  });
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const checkScrollPosition = React.useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const canScrollLeft = scrollLeft > 0;
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1; // -1 for rounding errors

    setScrollState({ canScrollLeft, canScrollRight });
  }, []);

  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Check initial state
    checkScrollPosition();

    // Add scroll listener
    container.addEventListener('scroll', checkScrollPosition);
    
    // Add resize listener for responsive changes
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition]);

  return (
    <div className="relative">
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800"
      >
        {personas.map((persona, idx) => (
          <motion.div 
            key={persona.id} 
            className="flex-shrink-0 w-80"
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <PersonaCard persona={persona} index={idx} />
          </motion.div>
        ))}
      </div>
      
      {/* Dynamic gradients */}
      <AnimatePresence>
        {scrollState.canScrollRight && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 right-0 bg-gradient-to-l from-neutral-900 to-transparent w-16 h-full pointer-events-none"
          />
        )}
        {scrollState.canScrollLeft && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 bg-gradient-to-r from-neutral-900 to-transparent w-16 h-full pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingSkeleton() {
  const { t } = useLocale();
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="insightsuite-card h-32 animate-pulse">
            <div className="skeleton h-4 w-24 mb-3" />
            <div className="skeleton h-8 w-32 mb-2" />
            <div className="skeleton h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="insightsuite-card h-[500px] animate-pulse">
            <div className="skeleton h-6 w-40 mb-4" />
            <div className="skeleton h-full rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="insightsuite-card h-[500px] animate-pulse">
            <div className="skeleton h-6 w-40 mb-4" />
            <div className="skeleton h-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="text-center text-neutral-500">
        {t("app.loading")}
      </div>
    </motion.div>
  );
}