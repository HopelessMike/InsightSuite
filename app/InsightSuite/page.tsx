"use client";

import * as React from "react";
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
import type { ProjectData } from "@/lib/types";
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
  airbnb: "/demo/projects/airbnb.json",
  mobile: "/demo/projects/mobile.json",
  ecommerce: "/demo/projects/ecommerce.json",
};

export default function InsightSuitePage() {
  const { t, locale } = useLocale();
  const [mounted, setMounted] = React.useState(false);
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
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch(PROJECT_FILES[selectedProject as TabKey], {
          cache: "no-store",
        });
        const data = (await res.json()) as ProjectData;
        if (!cancelled) setProjectData(data);
      } catch (e) {
        console.error("Failed to load project:", e);
        if (!cancelled) setProjectData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [selectedProject, setIsLoading, setProjectData]);

  const clusters = projectData?.clusters ?? [];
  const selectedCluster =
    clusters.find((c) => c.id === selectedClusterId) || null;

  const topThemes = React.useMemo(() => {
    return [...clusters].sort((a, b) => b.share - a.share).slice(0, 3);
  }, [clusters]);

  if (!mounted) return null;

  const datasetName = (key: TabKey) =>
    t(`datasets.${key}`) ?? key.toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_70%)]" />
      </div>

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
                  trend="+12.5%"
                  trendUp={true}
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
                  trend="+0.15"
                  trendUp={true}
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
                        <span className="max-w-[120px] truncate">
                          {cluster.label}
                        </span>
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>

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

              {/* Trends Section (optional) */}
              {projectData?.timeseries?.monthly?.length ? (
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
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="sentiment_mean"
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
                          <Tooltip />
                          <Area type="monotone" dataKey="volume" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {projectData?.timeseries?.clusters &&
                  Object.keys(projectData.timeseries.clusters).length ? (
                    <div className="mt-6 h-[260px]">
                      <div className="text-sm font-medium mb-2">
                        {t("charts.trends.topClusterTrends")}
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart>
                          <CartesianGrid
                            stroke="#27272a"
                            strokeDasharray="3 3"
                          />
                          <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                          <YAxis
                            domain={[0, 1]}
                            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                            tick={{ fill: "#a3a3a3", fontSize: 11 }}
                          />
                          <Tooltip />
                          <Legend />
                          {Object.entries(projectData.timeseries.clusters)
                            .slice(0, 3)
                            .map(([cid, series], idx) => (
                              <Line
                                key={cid}
                                data={series as any[]}
                                name={cid}
                                dataKey="share"
                                dot={false}
                                strokeWidth={2}
                              />
                            ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Personas */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h2 className="title-lg">{t("personas.title")}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectData?.personas?.map((persona, idx) => (
                    <motion.div key={persona.id} whileHover={{ y: -4, scale: 1.02 }}>
                      <PersonaCard persona={persona} index={idx} />
                    </motion.div>
                  ))}
                </div>
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

function LoadingSkeleton() {
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
    </motion.div>
  );
}
