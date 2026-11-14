"""Static content: roadmap, injury library, food library and skill tree (config/*.json)."""
import json
import os
from functools import lru_cache

_CONFIG_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "config"))


def _load(name: str) -> dict:
    with open(os.path.join(_CONFIG_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=None)
def roadmap() -> dict:
    return _load("roadmap.json")


@lru_cache(maxsize=None)
def injuries() -> dict:
    return _load("injuries.json")


@lru_cache(maxsize=None)
def foods() -> dict:
    return _load("foods.json")


def skill_tree() -> dict:
    return _load("skill_tree.json")


BELT_ORDER = ["white", "blue", "purple", "brown", "black"]


@lru_cache(maxsize=None)
def stages() -> list:
    """Flat, ordered list of every stripe stage with its belt attached."""
    out = []
    for belt in roadmap()["belts"]:
        for i, st in enumerate(belt["stages"]):
            out.append({**st, "belt": belt["id"], "index": i, "floor_weeks": belt["stage_floor_weeks"]})
    return out


def belt(belt_id: str) -> dict:
    for b in roadmap()["belts"]:
        if b["id"] == belt_id:
            return b
    if belt_id == "black":
        return roadmap()["black"]
    raise KeyError(belt_id)


def stage(belt_id: str, stripes: int):
    for st in stages():
        if st["belt"] == belt_id and st["index"] == stripes:
            return st
    return None
