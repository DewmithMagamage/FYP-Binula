"""Scoring, budget-constrained selection and progression logic (mirrors frontend/src/logic.js)."""
from __future__ import annotations
import random

COST = {"L": 2, "M": 5, "H": 10}  # LKR million per cost category (illustrative placeholders)


def norm_weights(w: dict) -> dict:
    t = (w.get("sev", 0) + w.get("prog", 0) + w.get("traf", 0)) or 1
    return {k: w.get(k, 0) / t for k in ("sev", "prog", "traf")}


def score(s: dict, w: dict, comp: str = "prog") -> float:
    w = norm_weights(w)
    return w["sev"] * s["sev"] + w["prog"] * s["prog" if comp == "prog" else "risk"] + w["traf"] * s["traffic"] / 3


def knapsack(items: list[dict], budget: int) -> set[str]:
    """0/1 knapsack: maximise total value subject to total cost <= budget (cost from category)."""
    B, n = int(budget), len(items)
    dp = [[0.0] * (B + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        c, v = COST[items[i - 1]["cost"]], items[i - 1]["v"]
        for b in range(B + 1):
            dp[i][b] = dp[i - 1][b]
            if c <= b and dp[i - 1][b - c] + v > dp[i][b]:
                dp[i][b] = dp[i - 1][b - c] + v
    picked, b = set(), B
    for i in range(n, 0, -1):
        if dp[i][b] != dp[i - 1][b]:
            picked.add(items[i - 1]["id"]); b -= COST[items[i - 1]["cost"]]
    return picked


def rank(sections: list[dict], method="proposed", w=None, comp="prog", budget=20, seed=42) -> list[dict]:
    w = w or {"sev": .4, "prog": .35, "traf": .25}
    rnd, mx = random.Random(seed), max(s["count"] for s in sections)
    def val(s):
        if method == "count": return s["count"] / mx
        if method == "sev": return s["sev"]
        if method == "rand": return rnd.random()
        return score(s, w, comp)
    rows = sorted(({**s, "v": val(s)} for s in sections), key=lambda r: -r["v"])
    pick = knapsack(rows, budget)
    for i, r in enumerate(rows):
        r["rank"], r["selected"] = i + 1, r["id"] in pick
    return rows


def progression(rounds: list[float]) -> dict:
    """Plan A: predict round 3 from rounds 1-2 (linear rate) and compare with a persistence baseline."""
    if len(rounds) < 3:
        return {"available": False, "reason": "needs at least three survey rounds (Plan B: risk indicator)"}
    r1, r2, r3 = rounds[:3]
    pred, persist = r2 + (r2 - r1), r2
    return {"available": True, "predicted_r3": round(pred, 2), "persistence_r3": round(persist, 2), "observed_r3": r3,
            "err_rate": round(abs(pred - r3), 2), "err_persistence": round(abs(persist - r3), 2),
            "rate_beats_persistence": abs(pred - r3) < abs(persist - r3)}
