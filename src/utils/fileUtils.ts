import type { Topology } from '../types';

/**
 * Export topology to JSON file
 */
export function exportTopologyToFile(topology: Topology, filename = 'topology.json') {
  const json = JSON.stringify(topology, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Import topology from JSON file
 */
export function importTopologyFromFile(): Promise<Topology> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const topology = JSON.parse(json) as Topology;
          
          // Basic validation
          if (!topology.subnets || !Array.isArray(topology.subnets)) {
            throw new Error('Invalid topology format: missing subnets array');
          }
          if (!topology.subnetLinks || !Array.isArray(topology.subnetLinks)) {
            throw new Error('Invalid topology format: missing subnetLinks array');
          }
          if (!topology.servers || !Array.isArray(topology.servers)) {
            throw new Error('Invalid topology format: missing servers array');
          }
          if (!topology.galeraNodes || !Array.isArray(topology.galeraNodes)) {
            throw new Error('Invalid topology format: missing galeraNodes array');
          }
          if (!topology.maxscaleNodes || !Array.isArray(topology.maxscaleNodes)) {
            throw new Error('Invalid topology format: missing maxscaleNodes array');
          }
          
          resolve(topology);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  });
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix = 'topology'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${prefix}-${year}${month}${day}-${hours}${minutes}.json`;
}
