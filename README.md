# GECTION

Personal finance manager for desktop.

Built with [Tauri](https://v2.tauri.app) (Rust) + [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [SQLite](https://www.sqlite.org) (via rusqlite).

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable toolchain)
- System dependencies for Tauri — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Quick start

```bash
# Clone the repository
git clone https://github.com/YOUR_USER/gection.git
cd gection

# Install frontend dependencies
npm install

# Run in development mode (starts Vite + Tauri dev server)
npm run tauri dev

# Build for production
npm run tauri build
```

The SQLite database is created automatically at `{app_data_dir}/gection.db` on first run — no manual setup needed.

## Available commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run build` | Type-check + build frontend |
| `npm run lint` | Run ESLint |
| `npm run tauri dev` | Full dev environment (frontend + Tauri) |
| `npm run tauri build` | Production build for current platform |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri v2](https://v2.tauri.app) |
| Frontend | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Routing | [React Router v7](https://reactrouter.com) |
| Icons | [Lucide](https://lucide.dev) |
| Database | [SQLite](https://www.sqlite.org) via [rusqlite](https://github.com/rusqlite/rusqlite) |

## Project structure

```
src/                    # React frontend
├── components/         # Shared UI components
├── lib/                # API client, helpers
├── pages/              # Route pages (Dashboard, Transactions, etc.)
├── stores/             # Zustand stores
└── types/              # TypeScript type definitions

src-tauri/              # Rust backend (Tauri)
├── src/
│   ├── commands/       # Tauri command handlers
│   ├── db/             # Database layer (connection, models, migrations)
│   ├── lib.rs          # App setup (DB init, command registration)
│   └── main.rs         # Entry point
└── tauri.conf.json     # Tauri configuration
```

## License

[MIT](LICENSE)
