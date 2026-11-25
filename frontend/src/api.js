import sample from "./sample.json";
const API = import.meta.env.VITE_API_BASE || null;
export const demoMode = !API;
export async function loadSections(budget) {
  if (!API) return sample;                       // demo mode: bundled illustrative data
  const r = await fetch(`${API}/api/priorities?budget=${budget}`); if (!r.ok) throw new Error("API error " + r.status); return r.json();
}
export async function uploadObservations(files, route, round) {
  if (!API) return { status: "demo mode: nothing uploaded", files: files.length };
  const fd = new FormData(); files.forEach((f) => fd.append("images", f)); fd.append("route", route); fd.append("round", round);
  const r = await fetch(`${API}/api/observations`, { method: "POST", body: fd }); return r.json();
}
export async function sendFeedback(id, decision, note) {
  if (!API) return; await fetch(`${API}/api/sections/${id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note }) });
}
