import { create } from "zustand"
import type { ProjectData } from "@/lib/types"

interface AppState {
  selectedProject: "airbnb" | "mobile" | "ecommerce"
  isLoading: boolean
  selectedClusterId: string | null
  compareSet: Set<string>
  projectData: ProjectData | null
  setSelectedProject: (project: "airbnb" | "mobile" | "ecommerce") => void
  setIsLoading: (loading: boolean) => void
  setSelectedClusterId: (id: string | null) => void
  toggleCompareCluster: (id: string) => void
  setProjectData: (data: ProjectData) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedProject: "airbnb",
  isLoading: false,
  selectedClusterId: null,
  compareSet: new Set(),
  projectData: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSelectedClusterId: (id) => set({ selectedClusterId: id }),
  toggleCompareCluster: (id) => {
    const { compareSet } = get()
    const newSet = new Set(compareSet)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    set({ compareSet: newSet })
  },
  setProjectData: (data) => set({ projectData: data }),
}))
