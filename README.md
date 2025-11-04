# HA Advisor

**High Availability Configuration Analysis Tool for Galera & MaxScale**

An interactive tool to design, configure, and analyze HA settings for MariaDB Galera Cluster and MaxScale deployments.

## Features

- 🏗️ **Topology Builder**: Define your infrastructure (subnets, servers, Galera nodes, MaxScale nodes)
- ⚙️ **HA Configuration**: Fine-tune Galera quorum settings and MaxScale cooperative monitoring
- 🔍 **Failure Analysis**: Test different failure scenarios (node failures, network partitions)
- 📊 **Visual Analysis**: Matrix view showing which failures your configuration can tolerate

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:5173`

### Build

```bash
npm run build
```

The build output will be in the `dist/` directory - portable and can be served by any static web server.

## Project Structure

```
src/
├── domain/              # Core business logic
│   ├── topology/        # Topology graph operations
│   ├── simulation/      # Failure simulation engine
│   ├── galera/          # Galera-specific rules & logic
│   ├── maxscale/        # MaxScale-specific rules & logic
│   └── analysis/        # Analysis result computation
├── components/          # React UI components
│   ├── topology-editor/ # Visual topology builder
│   ├── settings/        # HA settings configuration
│   ├── analysis/        # Results & visualization
│   └── common/          # Shared components
├── store/               # Zustand state management
├── types/               # TypeScript type definitions
└── utils/               # Helper functions
```

## Architecture Principles

1. **Fully Configurable**: No hardcoded limits on node counts or topology size
2. **Type-Safe**: Comprehensive TypeScript types for all domain concepts
3. **Testable**: Separation of domain logic from UI components
4. **Extensible**: Easy to add new failure types or analysis modes

## Technology Stack

- **React** + **TypeScript**: UI framework with type safety
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first styling
- **Zustand**: Lightweight state management
- **ReactFlow**: Topology visualization (to be integrated)
- **Vitest**: Unit testing framework

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Core type definitions
- [x] State management
- [x] Basic UI layout

### Phase 2: Topology Editor
- [ ] Visual subnet/server editor
- [ ] Node placement UI
- [ ] Topology validation
- [ ] Import/export configurations

### Phase 3: Simulation Engine
- [ ] Galera quorum calculation
- [ ] MaxScale cooperative monitoring logic
- [ ] Single failure scenario analysis
- [ ] Network partition handling

### Phase 4: Analysis & Visualization
- [ ] Failure matrix generation
- [ ] Results visualization (heatmap)
- [ ] Tolerance summary
- [ ] Detailed state reporting

### Phase 5: Polish
- [ ] Preset failure scenarios
- [ ] Auto-generate all combinations
- [ ] Export analysis reports
- [ ] Comprehensive documentation

## Contributing

This is a specialized tool for database HA planning. Contributions welcome!

## License

MIT
