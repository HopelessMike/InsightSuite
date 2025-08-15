"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/store/app"
import type { ProjectData, Cluster } from "@/lib/types"
import { StatCard } from "@/components/StatCard"
import { ThemesTreemap } from "@/components/ThemesTreemap"
import { OpportunityMatrix } from "@/components/OpportunityMatrix"
import { ClusterDetail } from "@/components/ClusterDetail"
import { PersonaCard } from "@/components/PersonaCard"
import { ReviewsTable } from "@/components/ReviewsTable"
import { MethodologyDrawer } from "@/components/MethodologyDrawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { motion } from "framer-motion"
import { Database, TrendingUp, Users } from "lucide-react"

export default function InsightSuitePage() {
  const {
    selectedProject,
    isLoading,
    selectedClusterId,
    projectData,
    setSelectedProject,
    setIsLoading,
    setProjectData,
  } = useAppStore()

  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)

  // Load project data
  useEffect(() => {
    const loadProjectData = async () => {
      setIsLoading(true)

      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 2500))

      try {
        const response = await fetch(`/demo/projects/${selectedProject}.json`)
        const data: ProjectData = await response.json()
        setProjectData(data)
      } catch (error) {
        console.error("Error loading project data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProjectData()
  }, [selectedProject, setIsLoading, setProjectData])

  // Update selected cluster when selectedClusterId changes
  useEffect(() => {
    if (selectedClusterId && projectData) {
      const cluster = projectData.clusters.find((c) => c.id === selectedClusterId)
      setSelectedCluster(cluster || null)
    } else {
      setSelectedCluster(null)
    }
  }, [selectedClusterId, projectData])

  if (isLoading || !projectData) {
    return <LoadingSkeleton />
  }

  const topThemes = projectData.clusters.sort((a, b) => b.share - a.share).slice(0, 3)

  const ratingData = projectData.aggregates.rating_hist.map(([rating, count]) => ({
    rating: `${rating}★`,
    count,
  }))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">InsightSuite</h1>
              <p className="text-sm text-muted-foreground">
                {projectData.meta.name} • {projectData.meta.source}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {(["airbnb", "mobile", "ecommerce"] as const).map((project) => (
                <Button
                  key={project}
                  variant={selectedProject === project ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProject(project)}
                  className="capitalize"
                >
                  {project}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Hero Insight Bar */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <StatCard
              title="Recensioni"
              value={projectData.meta.totals.reviews.toLocaleString()}
              subtitle={`${projectData.meta.totals.clusters} cluster identificati`}
            >
              <Database className="w-4 h-4 text-muted-foreground" />
            </StatCard>
          </div>

          <div className="col-span-3">
            <StatCard
              title="Sentiment Medio"
              value={projectData.aggregates.sentiment_mean > 0 ? "+" : ""}
              subtitle={`${projectData.aggregates.sentiment_mean.toFixed(2)} su scala -1/+1`}
            >
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </StatCard>
          </div>

          <div className="col-span-3">
            <StatCard title="Top Temi" value="" subtitle="Temi più discussi">
              <div className="flex flex-wrap gap-1 mt-2">
                {topThemes.map((theme, index) => (
                  <Badge key={theme.id} variant="secondary" className="text-xs">
                    {theme.label}
                  </Badge>
                ))}
              </div>
            </StatCard>
          </div>

          <div className="col-span-3">
            <StatCard title="Rating Summary" value="" subtitle="Distribuzione valutazioni">
              <div style={{ height: 60 }} className="mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingData}>
                    <XAxis dataKey="rating" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </StatCard>
          </div>
        </div>

        {/* Riga 2: Treemap + Matrix */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <ThemesTreemap clusters={projectData.clusters} />
          </div>
          <div className="col-span-4">
            <OpportunityMatrix clusters={projectData.clusters} />
          </div>
        </div>

        {/* Riga 3: Personas */}
        <div className="col-span-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Personas Utente</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectData.personas.map((persona, index) => (
                <PersonaCard key={persona.id} persona={persona} index={index} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Riga 4: Reviews Table */}
        <div className="col-span-12">
          <ReviewsTable clusters={projectData.clusters} />
        </div>

        {/* Footer */}
        <motion.div
          className="text-center py-8 border-t"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <MethodologyDrawer />
        </motion.div>
      </div>

      {/* Cluster Detail Sheet */}
      <ClusterDetail cluster={selectedCluster} />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Hero Cards Skeleton */}
        <div className="grid grid-cols-12 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-span-3">
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <Skeleton className="h-[540px] rounded-2xl" />
          </div>
          <div className="col-span-4">
            <Skeleton className="h-[540px] rounded-2xl" />
          </div>
        </div>

        {/* Personas Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>

        {/* Table Skeleton */}
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  )
}
