#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== BJJ Skill Tree — Dev Startup ==="
echo ""

# ─── Backend ───────────────────────────────────────────────
echo "▶ Starting FastAPI backend on http://localhost:8000"

cd "$ROOT"

# Create venv if needed
if [ ! -d ".venv" ]; then
  echo "  Creating Python virtual env…"
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# ─── Frontend ──────────────────────────────────────────────
echo ""
echo "▶ Starting React frontend on http://localhost:5173"

cd "$ROOT/src/frontend"

if [ ! -d "node_modules" ]; then
  echo "  Installing npm packages…"
  npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ App is up!"
echo "   Frontend → http://localhost:5173"
echo "   API docs  → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT INT TERM
wait
