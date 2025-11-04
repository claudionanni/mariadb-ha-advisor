import { create } from 'zustand';
import type { 
  Topology, 
  Subnet,
  SubnetLink,
  Server, 
  DatabaseNode,
  GaleraNode,
  AsyncReplicaNode,
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
  
  addDatabaseNode: (node: DatabaseNode) => void;
  updateDatabaseNode: (id: string, updates: Partial<DatabaseNode>) => void;
  removeDatabaseNode: (id: string) => void;
  
  // Legacy support - deprecated but kept for backward compatibility
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
  databaseNodes: [],
  maxscaleNodes: [],
};

// Helper to get galera nodes from databaseNodes (backward compatibility)
const getGaleraNodes = (topology: Topology): GaleraNode[] => {
  if (topology.galeraNodes && topology.galeraNodes.length > 0) {
    return topology.galeraNodes;
  }
  return topology.databaseNodes.filter(n => n.nodeType === 'galera') as GaleraNode[];
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
  
  // Database node actions (new unified interface)
  addDatabaseNode: (node) =>
    set((state) => ({
      topology: {
        ...state.topology,
        databaseNodes: [...state.topology.databaseNodes, node],
      },
    })),
    
  updateDatabaseNode: (id, updates) =>
    set((state) => ({
      topology: {
        ...state.topology,
        databaseNodes: state.topology.databaseNodes.map((n) =>
          n.id === id ? { ...n, ...updates } as DatabaseNode : n
        ),
      },
    })),
    
  removeDatabaseNode: (id) =>
    set((state) => ({
      topology: {
        ...state.topology,
        databaseNodes: state.topology.databaseNodes.filter((n) => n.id !== id),
      },
    })),
  
  // Legacy Galera node actions - delegates to databaseNodes
  addGaleraNode: (node) =>
    set((state) => ({
      topology: {
        ...state.topology,
        databaseNodes: [...state.topology.databaseNodes, { ...node, nodeType: 'galera' as const }],
      },
    })),
    
  updateGaleraNode: (id, updates) =>
    set((state) => ({
      topology: {
        ...state.topology,
        databaseNodes: state.topology.databaseNodes.map((n) =>
          n.id === id && n.nodeType === 'galera' ? { ...n, ...updates } as DatabaseNode : n
        ),
      },
    })),
    
  removeGaleraNode: (id) =>
    set((state) => ({
      topology: {
        ...state.topology,
        databaseNodes: state.topology.databaseNodes.filter((n) => n.id !== id),
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
  loadTopology: (topology) => {
    // Handle backward compatibility: migrate galeraNodes to databaseNodes if needed
    const migratedTopology = {
      ...topology,
      databaseNodes: topology.databaseNodes || [],
    };
    
    // If old galeraNodes exists and databaseNodes is empty, migrate
    if (topology.galeraNodes && topology.galeraNodes.length > 0 && migratedTopology.databaseNodes.length === 0) {
      migratedTopology.databaseNodes = topology.galeraNodes.map(node => ({
        ...node,
        nodeType: 'galera' as const,
      }));
    }
    
    set({ topology: migratedTopology });
  },
  
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
