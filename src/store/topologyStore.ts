import { create } from 'zustand';
import type { 
  Topology, 
  Subnet,
  SubnetLink,
  Server, 
  GaleraNode, 
  MaxScaleNode,
  FailureScenario,
  AnalysisResult 
} from '../types';

interface TopologyState {
  // Topology data
  topology: Topology;
  
  // Actions for topology management
  setTopologyName: (name: string) => void;
  setClusterType: (clusterType: 'galera' | 'async_replica') => void;
  
  addSubnet: (subnet: Subnet) => void;
  updateSubnet: (id: string, subnet: Partial<Subnet>) => void;
  removeSubnet: (id: string) => void;
  
  addSubnetLink: (link: SubnetLink) => void;
  updateSubnetLink: (id: string, link: Partial<SubnetLink>) => void;
  removeSubnetLink: (id: string) => void;
  
  addServer: (server: Server) => void;
  updateServer: (id: string, server: Partial<Server>) => void;
  removeServer: (id: string) => void;
  
  addGaleraNode: (node: GaleraNode) => void;
  updateGaleraNode: (id: string, node: Partial<GaleraNode>) => void;
  removeGaleraNode: (id: string) => void;
  
  addMaxScaleNode: (node: MaxScaleNode) => void;
  updateMaxScaleNode: (id: string, node: Partial<MaxScaleNode>) => void;
  removeMaxScaleNode: (id: string) => void;
  
  // Bulk operations
  loadTopology: (topology: Topology) => void;
  resetTopology: () => void;
  
  // Failure scenarios
  scenarios: FailureScenario[];
  addScenario: (scenario: FailureScenario) => void;
  updateScenario: (id: string, scenario: Partial<FailureScenario>) => void;
  removeScenario: (id: string) => void;
  
  // Analysis results
  analysisResults: Record<string, AnalysisResult>; // scenarioId -> result
  setAnalysisResult: (scenarioId: string, result: AnalysisResult) => void;
  clearAnalysisResults: () => void;
}

const initialTopology: Topology = {
  name: 'Untitled Configuration',
  clusterType: 'galera',
  subnets: [],
  subnetLinks: [],
  servers: [],
  galeraNodes: [],
  maxscaleNodes: [],
};

export const useTopologyStore = create<TopologyState>((set) => ({
  topology: initialTopology,
  scenarios: [],
  analysisResults: {},
  
  // Topology metadata
  setTopologyName: (name) =>
    set((state) => ({
      topology: { ...state.topology, name },
    })),
  
  setClusterType: (clusterType) =>
    set((state) => ({
      topology: { ...state.topology, clusterType },
    })),
  
  // Subnet actions
  addSubnet: (subnet) =>
    set((state) => ({
      topology: {
        ...state.topology,
        subnets: [...state.topology.subnets, subnet],
      },
    })),
    
  updateSubnet: (id, updates) =>
    set((state) => ({
      topology: {
        ...state.topology,
        subnets: state.topology.subnets.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
    })),
    
  removeSubnet: (id) =>
    set((state) => ({
      topology: {
        ...state.topology,
        subnets: state.topology.subnets.filter((s) => s.id !== id),
      },
    })),
  
  // Subnet link actions
  addSubnetLink: (link) =>
    set((state) => ({
      topology: {
        ...state.topology,
        subnetLinks: [...state.topology.subnetLinks, link],
      },
    })),
    
  updateSubnetLink: (id, updates) =>
    set((state) => ({
      topology: {
        ...state.topology,
        subnetLinks: state.topology.subnetLinks.map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      },
    })),
    
  removeSubnetLink: (id) =>
    set((state) => ({
      topology: {
        ...state.topology,
        subnetLinks: state.topology.subnetLinks.filter((l) => l.id !== id),
      },
    })),
  
  // Server actions
  addServer: (server) =>
    set((state) => ({
      topology: {
        ...state.topology,
        servers: [...state.topology.servers, server],
      },
    })),
    
  updateServer: (id, updates) =>
    set((state) => ({
      topology: {
        ...state.topology,
        servers: state.topology.servers.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
    })),
    
  removeServer: (id) =>
    set((state) => ({
      topology: {
        ...state.topology,
        servers: state.topology.servers.filter((s) => s.id !== id),
      },
    })),
  
  // Galera node actions
  addGaleraNode: (node) =>
    set((state) => ({
      topology: {
        ...state.topology,
        galeraNodes: [...state.topology.galeraNodes, node],
      },
    })),
    
  updateGaleraNode: (id, updates) =>
    set((state) => ({
      topology: {
        ...state.topology,
        galeraNodes: state.topology.galeraNodes.map((n) =>
          n.id === id ? { ...n, ...updates } : n
        ),
      },
    })),
    
  removeGaleraNode: (id) =>
    set((state) => ({
      topology: {
        ...state.topology,
        galeraNodes: state.topology.galeraNodes.filter((n) => n.id !== id),
      },
    })),
  
  // MaxScale node actions
  addMaxScaleNode: (node) =>
    set((state) => ({
      topology: {
        ...state.topology,
        maxscaleNodes: [...state.topology.maxscaleNodes, node],
      },
    })),
    
  updateMaxScaleNode: (id, updates) =>
    set((state) => ({
      topology: {
        ...state.topology,
        maxscaleNodes: state.topology.maxscaleNodes.map((n) =>
          n.id === id ? { ...n, ...updates } : n
        ),
      },
    })),
    
  removeMaxScaleNode: (id) =>
    set((state) => ({
      topology: {
        ...state.topology,
        maxscaleNodes: state.topology.maxscaleNodes.filter((n) => n.id !== id),
      },
    })),
  
  // Bulk operations
  loadTopology: (topology) => set({ topology }),
  
  resetTopology: () => set({ 
    topology: initialTopology, 
    scenarios: [], 
    analysisResults: {} 
  }),
  
  // Scenario actions
  addScenario: (scenario) =>
    set((state) => ({
      scenarios: [...state.scenarios, scenario],
    })),
    
  updateScenario: (id, updates) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
    
  removeScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
    })),
  
  // Analysis results
  setAnalysisResult: (scenarioId, result) =>
    set((state) => ({
      analysisResults: {
        ...state.analysisResults,
        [scenarioId]: result,
      },
    })),
    
  clearAnalysisResults: () => set({ analysisResults: {} }),
}));
