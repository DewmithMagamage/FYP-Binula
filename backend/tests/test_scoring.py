import itertools, json, pathlib
from fastapi.testclient import TestClient
from app.main import app
from app.scoring import COST, knapsack, progression, rank

S = json.loads((pathlib.Path(__file__).parents[1] / "app/sample.json").read_text())["sections"]


def test_knapsack_respects_budget_and_is_optimal():
    items = [{**s, "v": s["sev"]} for s in S]
    for budget in (0, 5, 12, 20, 40):
        got = knapsack(items, budget)
        assert sum(COST[i["cost"]] for i in items if i["id"] in got) <= budget
        best = max(sum(i["v"] for i in c) for r in range(len(items) + 1) for c in itertools.combinations(items, r) if sum(COST[i["cost"]] for i in c) <= budget)
        assert abs(sum(i["v"] for i in items if i["id"] in got) - best) < 1e-9


def test_rank_is_sorted_and_ranks_unique():
    rows = rank(S)
    assert [r["v"] for r in rows] == sorted((r["v"] for r in rows), reverse=True)
    assert [r["rank"] for r in rows] == list(range(1, len(rows) + 1))


def test_progression_plan_a_and_b():
    assert progression([1, 2])["available"] is False
    p = progression([2.0, 3.0, 4.0]); assert p["predicted_r3"] == 4.0 and p["rate_beats_persistence"]


def test_api_endpoints():
    c = TestClient(app)
    assert c.get("/api/health").json()["demo"] is True
    assert len(c.get("/api/priorities?budget=20").json()["sections"]) == 8
    assert c.post("/api/rank", json={"budget": 20}).json()[0]["rank"] == 1
    assert c.get("/api/sections/A/progression").json()["available"]
    assert c.get("/api/sections/ZZ/progression").status_code == 404
    r = c.post("/api/observations", files=[("images", ("x.jpg", b"123", "image/jpeg"))], data={"route": "R1"})
    assert r.status_code == 202 and r.json()["status"].startswith("stored_without_detection")
    assert c.post("/api/sections/A/feedback", json={"decision": "maybe"}).status_code == 422
