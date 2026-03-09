# BJJ Skill Tree Tracker

A full-stack training tracker for Brazilian Jiu-Jitsu that visualizes position progress as a skill tree, logs sessions, tracks drilling volume, and surfaces stale techniques to review.

## Features

- Interactive BJJ skill tree with node-level proficiency
- Session logging (Gi/No-Gi, session type, duration, notes, technique reps)
- Automatic proficiency updates with time-based decay
- Drill queue for stale or never-drilled techniques
- Weekly mat-time and top-position analytics
- Embedded technique video modal support
- FastAPI docs available at `/docs`

## Tech Stack

- Backend: FastAPI, SQLAlchemy, SQLite, Pydantic
- Frontend: React, TypeScript, Vite, Zustand, Tailwind, Recharts, Framer Motion

## Project Structure

```text
.
├── config/                  # Skill tree graph + techniques config
├── scripts/
│   └── start.sh             # Starts backend + frontend for local dev
├── src/
│   ├── backend/             # FastAPI app, models, routers, CRUD
│   └── frontend/            # React + Vite app
├── requirements.txt
└── bjj_tracker.db           # SQLite database (local)
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+

## Quick Start

Run both backend and frontend with one command:

```bash
bash scripts/start.sh
```

App URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

## Manual Setup

### 1) Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

```bash
cd src/frontend
npm install
npm run dev
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/sessions` - Create a training session with technique logs
- `GET /api/sessions?limit=20` - List recent sessions
- `GET /api/tree` - Skill tree with computed node proficiency
- `GET /api/tree/stats` - Dashboard metrics
- `GET /api/tree/drill-queue` - Suggested stale/never-drilled techniques

## Development Commands

```bash
# Frontend build
cd src/frontend && npm run build

# Start backend only
uvicorn src.backend.main:app --reload
```

## Push to GitHub

### First-time publish

1. Create a new empty repository on GitHub (no README, no .gitignore, no license).
2. From this project root, run:

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### If remote already exists

```bash
git add .
git commit -m "Update project"
git push
```

### Verify remote

```bash
git remote -v
```

## Notes

- This project currently uses SQLite (`bjj_tracker.db`) for local storage.
- Skill tree content and drill targets are defined in `config/skill_tree.json`.
