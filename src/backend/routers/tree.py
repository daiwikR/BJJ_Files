import json
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud

router = APIRouter(prefix="/api/tree", tags=["tree"])

_TREE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "config", "skill_tree.json"
)


def _load_tree() -> dict:
    with open(os.path.abspath(_TREE_PATH), "r") as f:
        return json.load(f)


def _build_target_map(tree: dict) -> dict:
    return {tech["id"]: tech["target_drills"] for tech in tree.get("techniques", [])}


@router.get("")
def get_tree(db: Session = Depends(get_db)):
    tree = _load_tree()
    target_map = _build_target_map(tree)
    node_proficiency = crud.compute_node_proficiency(db, tree, target_map)

    nodes = []
    for node in tree["nodes"]:
        nodes.append({**node, "proficiency": node_proficiency.get(node["id"], 0.0)})

    return {"nodes": nodes, "edges": tree["edges"], "techniques": tree["techniques"]}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return crud.get_stats(db)


@router.get("/drill-queue")
def get_drill_queue(db: Session = Depends(get_db)):
    tree = _load_tree()
    queue = crud.get_drill_queue(db, tree)
    # Enrich with technique names
    tech_name_map = {t["id"]: t["name"] for t in tree.get("techniques", [])}
    for item in queue:
        item["name"] = tech_name_map.get(item["technique_id"], item["technique_id"])
    return queue
