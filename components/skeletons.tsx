/**
 * Skeleton loading components for dashboard sections
 */

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

/**
 * Skeleton for Treemap visualization
 */
export function TreemapSkeleton() {
  return (
    <Card className="p-6 rounded-2xl">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="h-[480px] relative">
        <div className="grid grid-cols-3 gap-2 h-full">
          <div className="col-span-2 row-span-2">
            <Skeleton className="w-full h-full rounded" />
          </div>
          <div className="col-span-1 row-span-1">
            <Skeleton className="w-full h-full rounded" />
          </div>
          <div className="col-span-1 row-span-1">
            <Skeleton className="w-full h-full rounded" />
          </div>
          <div className="col-span-1 row-span-1">
            <Skeleton className="w-full h-full rounded" />
          </div>
          <div className="col-span-1 row-span-1">
            <Skeleton className="w-full h-full rounded" />
          </div>
          <div className="col-span-1 row-span-1">
            <Skeleton className="w-full h-full rounded" />
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Skeleton for Opportunity Matrix
 */
export function MatrixSkeleton() {
  return (
    <Card className="p-6 rounded-2xl">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="h-[480px] relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full relative">
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-muted">
              <Skeleton className="bg-muted/20" />
              <Skeleton className="bg-muted/20" />
              <Skeleton className="bg-muted/20" />
              <Skeleton className="bg-muted/20" />
            </div>
            {/* Scatter points */}
            <div className="absolute inset-0 p-8">
              <Skeleton className="absolute top-1/4 left-1/3 w-3 h-3 rounded-full" />
              <Skeleton className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full" />
              <Skeleton className="absolute bottom-1/3 right-1/3 w-3 h-3 rounded-full" />
              <Skeleton className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full" />
              <Skeleton className="absolute bottom-1/4 left-1/4 w-3 h-3 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </Card>
  )
}

/**
 * Skeleton for Persona Cards
 */
export function PersonaSkeleton() {
  return (
    <Card className="p-6 rounded-2xl h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Goals */}
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>

        {/* Pains */}
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        {/* Quotes */}
        <div>
          <Skeleton className="h-4 w-28 mb-2" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>

        {/* Channels */}
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-18" />
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Skeleton for Reviews Table
 */
export function TableSkeleton() {
  return (
    <Card className="p-6 rounded-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-5 gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-18" />
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b last:border-b-0">
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/**
 * Skeleton for stat cards
 */
export function StatCardSkeleton() {
  return (
    <Card className="p-6 rounded-2xl">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-16 w-full mt-2" />
      </div>
    </Card>
  )
}

/**
 * Complete dashboard skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Stat Cards */}
        <div className="grid grid-cols-12 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-span-3">
              <StatCardSkeleton />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <TreemapSkeleton />
          </div>
          <div className="col-span-4">
            <MatrixSkeleton />
          </div>
        </div>

        {/* Personas */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <PersonaSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Table */}
        <TableSkeleton />

        {/* Footer */}
        <div className="text-center py-8 border-t">
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    </div>
  )
}