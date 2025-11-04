# Quick Start Guide

## Prerequisites

- Node.js 18 or higher
- npm

## Installation

```bash
# Install dependencies (including dev dependencies)
npm install --include=dev
```

## Development

```bash
# Start the development server
npm run dev
```

Then open your browser to: **http://localhost:5173**

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (output in `dist/`)
- `npm run preview` - Preview production build locally
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Vitest

## Project Structure Overview

```
src/
├── types/              # TypeScript type definitions (START HERE)
├── store/              # Zustand state management
├── domain/             # Business logic (to be implemented)
│   ├── topology/       # Topology validation & graph operations
│   ├── simulation/     # Failure simulation engine
│   ├── galera/         # Galera quorum & HA logic
│   ├── maxscale/       # MaxScale cooperative monitoring logic
│   └── analysis/       # Result calculation & aggregation
├── components/         # React UI components
│   ├── common/         # Shared UI components
│   ├── topology-editor/ # Topology builder interface
│   ├── settings/       # HA settings configuration
│   └── analysis/       # Analysis results & visualization
└── utils/              # Helper functions
```

## Current Status

✅ **Phase 1: Foundation - COMPLETE**
- Project setup with modern tooling
- Comprehensive type system
- State management with Zustand
- Basic UI layout with 3-tab navigation
- All architecture decisions documented

🚧 **Phase 2: Topology Editor - NEXT**
- Implement subnet/server/node management UI
- Add visual topology builder
- Validation logic
- Import/export configurations

## Important Notes

### NPM Configuration

If you encounter issues with missing dependencies, your npm might be configured to omit dev dependencies. Always use:

```bash
npm install --include=dev
```

### Type-Driven Development

The entire data model is defined in `src/types/index.ts`. Start there to understand:
- What data structures exist
- What properties each entity has
- What the simulation engine needs to produce

### State Management

All application state is managed through Zustand in `src/store/topologyStore.ts`. To use it:

```typescript
import { useTopologyStore } from '../store/topologyStore';

function MyComponent() {
  // Get state
  const topology = useTopologyStore((state) => state.topology);
  
  // Get actions
  const addGaleraNode = useTopologyStore((state) => state.addGaleraNode);
  
  // Use them
  addGaleraNode({
    id: 'galera-1',
    name: 'Galera Node 1',
    serverId: 'server-1',
    settings: { pcWeight: 1 }
  });
}
```

## Next Development Steps

1. **Implement Subnet Management UI**
   - Create form component for adding subnets
   - Display list of subnets with edit/delete options
   - Validation (unique names, valid latency values)

2. **Implement Server Management UI**
   - Form to add physical/virtual servers
   - Dropdown to select subnet
   - Handle virtual machine hierarchy

3. **Implement Node Placement UI**
   - Form to add Galera nodes
   - Form to add MaxScale nodes
   - Select server for each node
   - Show default HA settings

4. **Add Visual Topology View**
   - Integrate ReactFlow
   - Render subnets as groups
   - Render servers as containers
   - Render nodes as shapes inside servers
   - Interactive selection and editing

## Getting Help

- Review `BOOTSTRAP_SUMMARY.md` for detailed architecture
- Check `README.md` for project overview and roadmap
- Review `initial_questions.txt` for requirements clarification
- All types in `src/types/index.ts` are heavily commented

## Architecture Principles

1. **Fully Configurable** - No hardcoded limits
2. **Type-Safe** - Leverage TypeScript completely
3. **Testable** - Pure domain logic separate from UI
4. **Extensible** - Easy to add features
5. **Data-Driven** - All topology/config as JSON

---

**Ready to build! Start with Phase 2: Topology Editor** 🚀
