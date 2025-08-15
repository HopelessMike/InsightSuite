"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Cluster, Quote } from "@/lib/types"
import { Search, Filter } from "lucide-react"
import { motion } from "framer-motion"

interface ReviewsTableProps {
  clusters: Cluster[]
}

export function ReviewsTable({ clusters }: ReviewsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCluster, setSelectedCluster] = useState<string>("all")
  const [selectedRating, setSelectedRating] = useState<string>("all")
  const [selectedLang, setSelectedLang] = useState<string>("all")

  // Flatten all quotes from all clusters
  const allQuotes = useMemo(() => {
    const quotes: (Quote & { clusterLabel: string; clusterId: string })[] = []
    clusters.forEach((cluster) => {
      cluster.quotes.forEach((quote) => {
        quotes.push({
          ...quote,
          clusterLabel: cluster.label,
          clusterId: cluster.id,
        })
      })
    })
    return quotes
  }, [clusters])

  // Filter quotes based on search and filters
  const filteredQuotes = useMemo(() => {
    return allQuotes.filter((quote) => {
      const matchesSearch = quote.text.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCluster = selectedCluster === "all" || quote.clusterId === selectedCluster
      const matchesRating = selectedRating === "all" || quote.rating?.toString() === selectedRating
      const matchesLang = selectedLang === "all" || quote.lang === selectedLang

      return matchesSearch && matchesCluster && matchesRating && matchesLang
    })
  }, [allQuotes, searchTerm, selectedCluster, selectedRating, selectedLang])

  const getSentimentColor = (rating?: number) => {
    if (!rating) return "text-gray-600"
    if (rating >= 4) return "text-green-600"
    if (rating <= 2) return "text-red-600"
    return "text-yellow-600"
  }

  const uniqueLanguages = [...new Set(allQuotes.map((q) => q.lang))]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="p-6 rounded-2xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recensioni e Feedback</h3>
            <Badge variant="secondary">
              {filteredQuotes.length} di {allQuotes.length} recensioni
            </Badge>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca nelle recensioni..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCluster} onValueChange={setSelectedCluster}>
              <SelectTrigger>
                <SelectValue placeholder="Tutti i cluster" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i cluster</SelectItem>
                {clusters.map((cluster) => (
                  <SelectItem key={cluster.id} value={cluster.id}>
                    {cluster.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRating} onValueChange={setSelectedRating}>
              <SelectTrigger>
                <SelectValue placeholder="Tutti i rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i rating</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ (5)</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ (4)</SelectItem>
                <SelectItem value="3">⭐⭐⭐ (3)</SelectItem>
                <SelectItem value="2">⭐⭐ (2)</SelectItem>
                <SelectItem value="1">⭐ (1)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLang} onValueChange={setSelectedLang}>
              <SelectTrigger>
                <SelectValue placeholder="Tutte le lingue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le lingue</SelectItem>
                {uniqueLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setSelectedCluster("all")
                setSelectedRating("all")
                setSelectedLang("all")
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recensione</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Lingua</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.slice(0, 50).map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="max-w-md">
                      <p className="text-sm truncate" title={quote.text}>
                        {quote.text}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {quote.clusterLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {quote.rating && (
                        <span className={`font-medium ${getSentimentColor(quote.rating)}`}>
                          {"⭐".repeat(quote.rating)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {quote.lang.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredQuotes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna recensione trovata con i filtri selezionati.
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
