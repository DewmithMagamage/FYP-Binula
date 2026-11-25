# Road Maintenance Decision Support (research prototype)

Drone-based damage detection, budget-aware prioritisation and progression view for Sri Lankan highways.
**Decision support only: final maintenance decisions rest with qualified officers.**

## Run the backend (FastAPI)
```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                              # 4 tests: knapsack optimality, ranking, progression, API
uvicorn app.main:app --reload       # http://localhost:8000/docs
```
## Run the frontend (React + Vite)
```
cd frontend
npm install
npm run dev                         # http://localhost:5173  (demo mode, bundled sample data)
cp .env.example .env                # set VITE_API_BASE=http://localhost:8000 to use the backend
```
## What is real and what is not
- **Real:** weighted scoring, 0/1 knapsack budget selection, baseline rankings (damage count, severity only, seeded random), persistence-vs-rate progression test, upload endpoint, feedback endpoint, tests.
- **Sample data:** `sample.json` holds eight illustrative sections and round areas. They are not measurements. Do not report them as results. Cost categories (2, 5, 10 LKR million) are placeholders.
- **No detector is bundled.** `POST /api/observations` stores images and returns `stored_without_detection` until you set `YOLO_WEIGHTS=/path/to/your_trained.pt` and `pip install ultralytics`. Results are never fabricated.
- Not included: database, authentication, section matching across rounds, photogrammetry severity, satellite rainfall ingestion, expert-panel tooling. These are the next build steps from your Chapter 3.

## Before real data
Drone flights need aviation authorisation; blur faces and number plates before storing images; the expert panel needs ethics approval.
