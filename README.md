# Stratum Demo - 3D Mining Visualization

A one-page mining visualization demo that allows geologists and mine planners to explore 3D ore bodies interactively.

## Features

- **3D Visualization**: Interactive 3D ore body rendering with Three.js
- **Grade Filtering**: Two-handle slider to filter visible grades
- **Depth Slicing**: Vertical slider to slice ore body at chosen depth
- **Model Toggle**: Switch between AI and Kriging models
- **Interactive Selection**: Click points to view detailed insights
- **Insights Panel**: Collapsible drawer with statistics and analysis

## Tech Stack

- **React 18** with TypeScript
- **Three.js** for 3D visualization
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **OrbitControls** for camera interaction

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

## Project Structure

```
stratum-demo/
├── src/
│   ├── App.tsx          # Main React component
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles with Tailwind
├── public/              # Static assets
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── tailwind.config.js   # Tailwind CSS configuration
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Data Format

The application expects CSV files with columns:
- X, Y, Z coordinates
- AUGT (grade) values
- CONF (confidence) classification

Supported column name variations are automatically detected.
