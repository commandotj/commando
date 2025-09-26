# Commando Client

A modern two-panel file manager built with Electron, React, and TypeScript. Commando Client provides an intuitive dual-pane interface for efficient file management with advanced features like batch operations, drag-and-drop, and real-time progress tracking.

## Features

### Core File Management
- **Dual-Pane Interface**: Navigate two directories simultaneously for easy file operations
- **Drive Detection**: Automatic detection and listing of all system drives
- **Directory Navigation**: Breadcrumb navigation with collapsible path segments
- **File Operations**: Copy, move, and manage files with progress tracking

### Advanced Functionality
- **Batch Copy Operations**: Copy multiple files with real-time progress monitoring
- **Worker-Based Processing**: Non-blocking file operations using Web Workers
- **Queue Management**: Intelligent task queuing for optimal performance
- **Resizable Columns**: Customizable table layout with drag-to-resize columns
- **Multi-Selection**: Support for Ctrl/Cmd and Shift-based multi-selection
- **Theme Support**: Light/dark theme switching with system preference detection

### Technical Features
- **Internationalization**: Built-in i18n support (English/Chinese)
- **Responsive Design**: Tailwind CSS with dark mode support
- **Type Safety**: Full TypeScript implementation
- **Testing**: Comprehensive test suite with Jest and React Testing Library
- **Modern UI**: Radix UI components with smooth animations

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Desktop**: Electron 35
- **State Management**: Redux Toolkit
- **UI Components**: Radix UI, Chakra UI
- **File Operations**: Node.js fs, klaw, drivelist
- **Build Tool**: Electron Vite
- **Testing**: Jest, React Testing Library
- **Styling**: Tailwind CSS, Framer Motion

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── batchCopyService.ts  # Batch file operations
│   ├── workerManager.ts     # Worker thread management
│   ├── listDir.ts          # Directory listing
│   ├── drive.ts            # Drive detection
│   ├── ipc.ts              # IPC handlers
│   └── logger.ts           # Logging system
├── preload/                # Electron preload scripts
└── renderer/               # React frontend
    ├── app/                # Redux store and slices
    ├── components/         # React components
    │   ├── FilePane.tsx    # Main file browser pane
    │   ├── ResizableTable.tsx # Resizable data table
    │   └── SplitterLayout/ # Resizable panel layout
    └── common/             # Shared utilities
```

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd commando-client

# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux

# Build without packaging
npm run build:unpack
```

## Architecture

### Main Process
The Electron main process handles:
- File system operations via IPC
- Worker thread management for non-blocking operations
- Drive detection and system integration
- Window management and menu creation

### Renderer Process  
The React frontend provides:
- Dual-pane file browser interface
- Real-time progress tracking
- Responsive design with theme support
- Advanced selection and navigation features

### IPC Communication
Secure communication between processes using:
- `list-dir`: Directory listing
- `list-drives`: System drive detection  
- `copy-file`: Single file operations
- `copy-batch`: Batch file operations
- `log:message`: Centralized logging

## Configuration

### Internationalization
Supported languages in `src/main/i18n/`:
- English (`en-US.json`)
- Chinese (`zh-CN.json`)

### Themes
- Light/dark mode toggle
- System preference detection
- Persistent theme storage

## Testing

The project includes comprehensive tests for:
- Component rendering and interaction
- File operations and state management
- Async operations and error handling
- User interface responsiveness

```bash
# Run all tests
npm test

# Watch mode for development
npm test -- --watch

# Coverage report
npm run test:coverage
```

## RFC Process

This project uses RFC (Request for Comments) to document and track important design decisions, architectural changes, and feature proposals. All major changes should be documented as RFCs.

### RFC Documentation
- [RFC Process Guide](docs/rfc/README.md) - Complete RFC process, guidelines, index, and template

### Creating a New RFC
1. Use the RFC template in `docs/rfc/README.md` to create a new RFC document
2. Follow the RFC numbering rules: `RFC-YYYY-NNN`
3. Fill in the complete RFC content following the template structure
4. Register the new RFC in the RFC list section of `docs/rfc/README.md`
5. Submit a PR for review

### RFC Status Tracking
- 🔵 **Proposed** - New proposal awaiting discussion
- 🟡 **Under Discussion** - Currently being discussed
- 🟠 **Under Review** - Technical review in progress
- 🟢 **Approved** - Approved and ready for implementation
- 🔵 **In Progress** - Currently being implemented
- ✅ **Completed** - Implementation completed
- ❌ **Deprecated** - No longer applicable

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. For major changes, create an RFC first
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**Albert Lee** - [albert_lee@hotmail.com](mailto:albert_lee@hotmail.com)

Homepage: [https://www.systembug.com/commando](https://www.systembug.com/commando)
