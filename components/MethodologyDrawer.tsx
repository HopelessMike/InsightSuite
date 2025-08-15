"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, BookOpen, BarChart3, Users, Target } from "lucide-react"

export function MethodologyDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" className="text-sm text-muted-foreground">
          <Info className="w-4 h-4 mr-2" />
          Methodology & Attribution
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Metodologia e Attribuzioni
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Overview */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Panoramica del Sistema</h3>
            <p className="text-sm text-muted-foreground">
              InsightSuite utilizza tecniche avanzate di analisi del testo e machine learning per estrarre insight
              significativi da grandi volumi di feedback degli utenti. Il sistema combina clustering automatico, analisi
              del sentiment e identificazione di personas per fornire una visione completa dell'esperienza utente.
            </p>
          </Card>

          {/* Clustering */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Clustering dei Temi</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                I temi vengono identificati utilizzando algoritmi di clustering semantico che raggruppano recensioni
                simili in base al contenuto e al contesto.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Algoritmo
                  </Badge>
                  <span className="text-sm">K-means + DBSCAN ibrido</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Embedding
                  </Badge>
                  <span className="text-sm">Sentence-BERT multilingue</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Soglia
                  </Badge>
                  <span className="text-sm">Similarità coseno &gt; 0.75</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Sentiment Analysis */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">Analisi del Sentiment</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Il sentiment viene calcolato utilizzando modelli transformer pre-addestrati e calibrati su dataset
                specifici del dominio.
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded">
                  <div className="font-medium text-red-600">Negativo</div>
                  <div className="text-muted-foreground">&lt; -0.3</div>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-950 rounded">
                  <div className="font-medium text-gray-600">Neutro</div>
                  <div className="text-muted-foreground">-0.3 to 0.3</div>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                  <div className="font-medium text-green-600">Positivo</div>
                  <div className="text-muted-foreground">&gt; 0.3</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Personas */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold">Identificazione Personas</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Le personas vengono generate attraverso l'analisi dei pattern comportamentali e delle preferenze
                espresse nei feedback degli utenti.
              </p>
              <ul className="text-sm space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Clustering comportamentale basato su obiettivi e pain points</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Analisi delle co-occorrenze tematiche</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Validazione statistica della significatività dei segmenti</span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Opportunity Matrix */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Matrice delle Opportunità</h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                La matrice combina l'intensità negativa del sentiment con la dimensione del cluster per identificare le
                priorità di intervento.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-medium">Asse X: Intensità Negativa</div>
                  <div className="text-muted-foreground">max(0, -sentiment_score)</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">Asse Y: Share</div>
                  <div className="text-muted-foreground">cluster_size / total_reviews</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Attribution */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Attribuzioni e Tecnologie</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Framework UI:</span>
                <span className="text-muted-foreground">Next.js + shadcn/ui</span>
              </div>
              <div className="flex justify-between">
                <span>Visualizzazioni:</span>
                <span className="text-muted-foreground">Recharts</span>
              </div>
              <div className="flex justify-between">
                <span>Animazioni:</span>
                <span className="text-muted-foreground">Framer Motion</span>
              </div>
              <div className="flex justify-between">
                <span>State Management:</span>
                <span className="text-muted-foreground">Zustand</span>
              </div>
              <div className="flex justify-between">
                <span>Styling:</span>
                <span className="text-muted-foreground">Tailwind CSS</span>
              </div>
            </div>
          </Card>

          {/* Data Sources */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Fonti Dati Demo</h3>
            <p className="text-sm text-muted-foreground mb-3">
              I dati utilizzati in questa demo sono sintetici e generati per scopi dimostrativi. In un ambiente di
              produzione, i dati provengono da:
            </p>
            <ul className="text-sm space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>API di recensioni (Google, Yelp, App Store, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Feedback surveys e NPS</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Social media monitoring</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Customer support tickets</span>
              </li>
            </ul>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
