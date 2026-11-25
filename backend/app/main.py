import json, pathlib, uuid
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from . import detector
from .scoring import progression, rank

HERE = pathlib.Path(__file__).parent
DATA = json.loads((HERE / "sample.json").read_text())  # demo data until a database is connected
UPLOADS = pathlib.Path("data/uploads"); UPLOADS.mkdir(parents=True, exist_ok=True)
FEEDBACK: dict[str, dict] = {}

app = FastAPI(title="Road Maintenance Decision Support API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])


class RankRequest(BaseModel):
    method: str = "proposed"
    comp: str = "prog"
    budget: int = 20
    weights: dict = {"sev": .4, "prog": .35, "traf": .25}


class Feedback(BaseModel):
    decision: str
    note: str = ""


def section(sid: str) -> dict:
    s = next((x for x in DATA["sections"] if x["id"] == sid), None)
    if not s: raise HTTPException(404, "section not found")
    return s


@app.get("/api/health")
def health(): return {"ok": True, "demo": DATA["demo"]}


@app.get("/api/priorities")
def priorities(budget: int = 20):
    return {"demo": DATA["demo"], "note": DATA["note"], "budget": budget, "sections": DATA["sections"]}


@app.post("/api/rank")
def rank_sections(req: RankRequest):
    return rank(DATA["sections"], req.method, req.weights, req.comp, req.budget)


@app.get("/api/sections/{sid}/progression")
def section_progression(sid: str): return progression(section(sid)["rounds"])


@app.post("/api/observations", status_code=202)
async def observations(images: list[UploadFile] = File(...), route: str = Form(""), round: str = Form("")):
    saved, detections = [], []
    for f in images:
        p = UPLOADS / f"{uuid.uuid4().hex}_{pathlib.Path(f.filename).name}"
        p.write_bytes(await f.read()); saved.append(str(p))
    try:
        detections = [detector.detect(p) for p in saved]; status = "detected"
    except detector.ModelNotConfigured as e:
        status = f"stored_without_detection: {e}"
    return {"job_id": uuid.uuid4().hex, "route": route, "round": round, "files": len(saved), "status": status, "detections": detections}


@app.post("/api/sections/{sid}/feedback")
def feedback(sid: str, fb: Feedback):
    section(sid)
    if fb.decision not in ("accept", "reject"): raise HTTPException(422, "decision must be accept or reject")
    FEEDBACK[sid] = fb.model_dump(); return FEEDBACK[sid]
