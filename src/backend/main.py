from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import seed
from .routers import fuel, profile, recovery, sessions, tree

# Create tables, patch older databases and seed the injury + food libraries.
seed.run()

app = FastAPI(title="OSS // BJJ Progress API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (sessions.router, tree.router, profile.router, recovery.router, fuel.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok"}
