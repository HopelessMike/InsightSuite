import { create } from "zustand";
import type { ProjectData } from "@/lib/types";

interface AppState {
  // Project state
  selectedProject: "airbnb" | "mobile" | "ecommerce";
  projectData: ProjectData | null;
  isLoading: boolean;
  error: string | null;
  
  // UI state
  selectedClusterId: string | null;
  compareSet: Set<string>;
  showFilters: boolean;
  searchQuery: string;
  
  // Actions
  setSelectedProject: (project: "airbnb" | "mobile" | "ecommerce") => void;
  setProjectData: (data: ProjectData | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedClusterId: (id: string | null) => void;
  toggleCompareCluster: (id: string) => void;
  clearCompareSet: () => void;
  setShowFilters: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

const initialState = {
  selectedProject: "airbnb" as const,
  projectData: null,
  isLoading: false,
  error: null,
  selectedClusterId: null,
  compareSet: new Set<string>(),
  showFilters: false,
  searchQuery: "",
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,
  
  // Actions
  setSelectedProject: (project) => {
    set({ 
      selectedProject: project,
      selectedClusterId: null,
      compareSet: new Set(),
      error: null
    });
  },
  
  setProjectData: (data) => {
    set({ projectData: data, error: null });
  },
  
  setIsLoading: (loading) => {
    set({ isLoading: loading });
  },
  
  setError: (error) => {
    set({ error, isLoading: false });
  },
  
  setSelectedClusterId: (id) => {
    set({ selectedClusterId: id });
  },
  
  toggleCompareCluster: (id) => {
    const { compareSet } = get();
    const newSet = new Set(compareSet);
    
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      // Limit to 5 clusters for comparison
      if (newSet.size < 5) {
        newSet.add(id);
      }
    }
    
    set({ compareSet: newSet });
  },
  
  clearCompareSet: () => {
    set({ compareSet: new Set() });
  },
  
  setShowFilters: (show) => {
    set({ showFilters: show });
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
  
  reset: () => {
    set(initialState);
  },
}));