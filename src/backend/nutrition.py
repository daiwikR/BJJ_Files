"""Daily fuelling targets, fuel score and plain-language hints.

Targets follow the joint ACSM / Academy of Nutrition and Dietetics / Dietitians of Canada
position on nutrition and athletic performance (carbohydrate scaled to the day's training
load, fat not below about 20% of energy, 0.4-0.8 L fluid per training hour) and the ISSN
protein position stand (1.4-2.0 g/kg/day, more when cutting weight). Energy is estimated
with Mifflin-St Jeor plus a MET-based training cost, which is a rough estimate only.
"""
from __future__ import annotations

DEFAULT_WEIGHT_KG = 75.0

DAY_TYPES = {
    # carbs g/kg, net training cost in kcal per kg per hour (METs above resting), label
    "rest":     {"carbs": 3.0, "met": 0.0, "label": "Rest day"},
    "light":    {"carbs": 4.0, "met": 3.0, "label": "Light / drilling day"},
    "moderate": {"carbs": 5.0, "met": 5.0, "label": "Normal class day"},
    "hard":     {"carbs": 7.0, "met": 7.0, "label": "Hard / double-session day"},
}
GOALS = {
    "cut":      {"energy": 0.85, "protein": 2.2, "carb_shift": -1.0},
    "maintain": {"energy": 1.00, "protein": 1.8, "carb_shift": 0.0},
    "gain":     {"energy": 1.08, "protein": 1.8, "carb_shift": 0.5},
}


def met_for_rpe(rpe: float) -> float:
    """Net cost of a whole session (warm-up, drilling and rolling averaged) in kcal/kg/h.
    A class is not continuous hard rolling, so these sit below peak grappling values
    (Compendium of Physical Activities: martial arts about 5 METs moderate, 10 vigorous)."""
    if rpe <= 3:
        return 2.5
    if rpe <= 5:
        return 4.0
    if rpe <= 7:
        return 5.5
    return 7.5


def day_type_from_load(load: float, sessions: int) -> str:
    """Session-RPE load (RPE x minutes) for the day -> fuelling tier."""
    if sessions == 0 or load <= 0:
        return "rest"
    if sessions >= 2 or load >= 600:
        return "hard"
    if load >= 300:
        return "moderate"
    return "light"


def bmr(weight_kg: float, height_cm: float | None, age: int | None, sex: str | None) -> float:
    if height_cm and age:
        base = 10 * weight_kg + 6.25 * height_cm - 5 * age
        if sex == "male":
            return base + 5
        if sex == "female":
            return base - 161
        return base - 78
    return 24 * weight_kg


def targets(*, weight_kg: float | None, height_cm: float | None = None, age: int | None = None,
            sex: str | None = None, goal: str = "maintain", day_type: str = "moderate",
            training_hours: float = 0.0, training_kcal: float | None = None) -> dict:
    assumed = weight_kg is None
    kg = weight_kg or DEFAULT_WEIGHT_KG
    tier = DAY_TYPES.get(day_type, DAY_TYPES["moderate"])
    g = GOALS.get(goal, GOALS["maintain"])

    if training_kcal is None:
        training_kcal = tier["met"] * kg * training_hours
    tdee = bmr(kg, height_cm, age, sex) * 1.4 + training_kcal
    energy = tdee * g["energy"]

    protein = g["protein"] * kg
    carbs_goal = max(2.5, tier["carbs"] + g["carb_shift"]) * kg
    fat = (energy - 4 * protein - 4 * carbs_goal) / 9
    fat = max(0.8 * kg, min(0.35 * energy / 9, fat))    # floor 0.8 g/kg, ceiling 35% of energy
    carbs = (energy - 4 * protein - 9 * fat) / 4
    carbs = max(2.5 * kg, carbs if g["energy"] < 1 else max(carbs, carbs_goal))
    kcal = 4 * protein + 4 * carbs + 9 * fat
    water = 35 * kg + 600 * training_hours

    return {
        "day_type": day_type,
        "day_label": tier["label"],
        "goal": goal,
        "weight_kg": kg,
        "weight_assumed": assumed,
        "kcal": round(kcal / 10) * 10,
        "protein": round(protein),
        "carbs": round(carbs / 5) * 5,
        "fat": round(fat),
        "water_ml": int(round(water / 50) * 50),
        "per_kg": {"protein": round(protein / kg, 1), "carbs": round(carbs / kg, 1), "fat": round(fat / kg, 1)},
        "tdee": round(tdee),
        "training_kcal": round(training_kcal),
        "fat_floor": round(0.8 * kg),
    }


def _ratio(have: float, want: float) -> float:
    return have / want if want > 0 else 1.0


def fuel_score(totals: dict, t: dict) -> dict:
    """0-100. Protein 35, carbs 25, energy 20, water 20."""
    p = min(1.0, _ratio(totals["protein"], t["protein"]) / 0.9)
    carb_full = 0.7 if t["day_type"] == "rest" else 0.85
    c = min(1.0, _ratio(totals["carbs"], t["carbs"]) / carb_full)
    e_ratio = _ratio(totals["kcal"], t["kcal"])
    if e_ratio < 0.85:
        e = e_ratio / 0.85
    elif e_ratio <= 1.15:
        e = 1.0
    else:
        e = max(0.4, 1 - (e_ratio - 1.15) * 1.5)
    w = min(1.0, _ratio(totals["water_ml"], t["water_ml"]) / 0.9)
    parts = {"protein": round(35 * p, 1), "carbs": round(25 * c, 1), "energy": round(20 * e, 1), "water": round(20 * w, 1)}
    return {"score": round(sum(parts.values())), "parts": parts, "energy_ratio": round(e_ratio, 2)}


def expected_fraction(hour: float) -> float:
    """Share of the day's intake you would expect by this hour (06:00 -> 21:00 window)."""
    return max(0.1, min(1.0, (hour - 6) / 15))


def hints(totals: dict, t: dict, *, hour: float = 24.0, trained_today: bool = False,
          short_sleep: bool = False, low_days: int = 0) -> list[dict]:
    """Ordered list of {key, tone, title, text}. tone: warn | info | good."""
    out: list[dict] = []
    kg = t["weight_kg"]
    frac = expected_fraction(hour)
    logged_anything = totals["kcal"] > 0 or totals["water_ml"] > 0
    training_day = t["day_type"] != "rest"

    def gap(key):
        return t[key] - totals[key]

    # Water
    w_ratio = _ratio(totals["water_ml"], t["water_ml"])
    if hour >= 10 and w_ratio < frac * 0.7:
        behind = max(250, int(round((t["water_ml"] * frac - totals["water_ml"]) / 50) * 50))
        out.append({"key": "water", "tone": "warn", "title": "Low on water",
                    "text": f"{totals['water_ml'] / 1000:.1f} L of {t['water_ml'] / 1000:.1f} L. You are about {behind} mL behind for this time of day. "
                            f"Drink 500 mL now and keep sipping. Pale-yellow urine is the target."})
    elif w_ratio >= 0.9:
        out.append({"key": "water", "tone": "good", "title": "Hydration on point",
                    "text": f"{totals['water_ml'] / 1000:.1f} L down. Add 400-800 mL for every hour on the mat."})

    # Protein
    p_ratio = _ratio(totals["protein"], t["protein"])
    if hour >= 11 and p_ratio < frac * 0.75:
        need = max(0, round(gap("protein")))
        per_meal = round(0.35 * kg)
        out.append({"key": "protein", "tone": "warn", "title": "Increase protein",
                    "text": f"{round(totals['protein'])} g of {t['protein']} g. {need} g to go. "
                            f"Aim for about {per_meal} g at each remaining meal (roughly 150 g chicken, 200 g paneer or tofu, or a scoop of whey with 250 g curd)."})
    elif p_ratio >= 0.9:
        out.append({"key": "protein", "tone": "good", "title": "Protein covered",
                    "text": f"{round(totals['protein'])} g in. Muscle repair has what it needs."})

    # Carbs
    c_ratio = _ratio(totals["carbs"], t["carbs"])
    if training_day and hour >= 11 and c_ratio < frac * 0.7:
        if not trained_today:
            lo, hi = round(1 * kg), round(2 * kg)
            out.append({"key": "carbs", "tone": "warn", "title": "Carb up today",
                        "text": f"{t['day_label']}: {round(totals['carbs'])} g of {t['carbs']} g carbs so far. "
                                f"Get {lo}-{hi} g in the 1-4 hours before training (rice, roti, oats, banana, dates) so you are not rolling on empty."})
        else:
            out.append({"key": "carbs", "tone": "warn", "title": "Refill carbs",
                        "text": f"You trained and carbs are at {round(totals['carbs'])} g of {t['carbs']} g. "
                                f"Add about {round(1 * kg)} g with your next meal to restock glycogen for tomorrow."})
    elif not training_day and c_ratio > 1.3:
        out.append({"key": "carbs", "tone": "info", "title": "Carbs high for a rest day",
                    "text": f"{round(totals['carbs'])} g against a rest-day target of {t['carbs']} g. Not a problem once; save the big carb days for hard sessions."})
    elif training_day and c_ratio >= 0.85:
        out.append({"key": "carbs", "tone": "good", "title": "Tank is full",
                    "text": f"{round(totals['carbs'])} g carbs in. Enough fuel for hard rounds."})

    # Fat
    if logged_anything and hour >= 18 and totals["fat"] < t["fat_floor"] * 0.8:
        out.append({"key": "fat", "tone": "warn", "title": "Fats too low",
                    "text": f"{round(totals['fat'])} g, under the {t['fat_floor']} g floor (0.8 g per kg). "
                            f"Very low fat for long periods hurts hormones and joint recovery. Add nuts, eggs, olive oil, ghee or avocado."})
    elif totals["fat"] > t["fat"] * 1.4:
        out.append({"key": "fat", "tone": "info", "title": "Fats running high",
                    "text": f"{round(totals['fat'])} g against {t['fat']} g. Fat is slow to digest; keep it low in the meal before training and swap some for carbs."})

    # Energy
    e_ratio = _ratio(totals["kcal"], t["kcal"])
    if hour >= 19 and logged_anything and e_ratio < 0.7:
        out.append({"key": "energy", "tone": "warn", "title": "Under-fuelled",
                    "text": f"{round(totals['kcal'])} kcal of {t['kcal']} kcal. Eating this far under on a training day slows recovery and raises injury and illness risk. Add a proper meal."})
    if low_days >= 2:
        out.append({"key": "low_streak", "tone": "warn", "title": "Running on empty",
                    "text": f"{low_days} of your last 3 logged days were under 75% of target energy. Low energy availability stalls strength, sleep and healing. Eat at target for a few days before pushing hard sessions."})

    # Context
    if trained_today:
        out.append({"key": "post", "tone": "info", "title": "After training",
                    "text": f"Within a couple of hours: about {round(0.3 * kg)} g protein and {round(1 * kg)} g carbs. Replace 1.25-1.5 L of fluid for every kg lost in sweat."})
    if short_sleep:
        out.append({"key": "sleep", "tone": "info", "title": "Short on sleep",
                    "text": "Keep protein and carbs at target today; appetite signals are unreliable after a bad night. No caffeine after early afternoon."})
    if t["weight_assumed"]:
        out.append({"key": "weight", "tone": "info", "title": "Add your body weight",
                    "text": f"Targets are using a placeholder of {DEFAULT_WEIGHT_KG:.0f} kg. Set your weight in Profile for numbers that fit you."})
    return out
