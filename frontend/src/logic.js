// Mirrors backend/app/scoring.py so sliders re-rank instantly in the browser.
export const COST = { L: 2, M: 5, H: 10 }; // LKR million per cost category (illustrative)
export const METHODS = { proposed: "Proposed (weighted score)", count: "Baseline: damage count", sev: "Baseline: severity only", rand: "Baseline: random (seeded)" };
export const lv = (x) => (x >= 0.66 ? "H" : x >= 0.4 ? "M" : "L");
const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function parts(s, w, comp) { const t = w.sev + w.prog + w.traf || 1; return { sev: (w.sev / t) * s.sev, prog: (w.prog / t) * (comp === "prog" ? s.prog : s.risk), traf: (w.traf / t) * (s.traffic / 3) }; }
export function knapsack(items, budget) {
  const n = items.length, B = Math.floor(budget), dp = Array.from({ length: n + 1 }, () => new Array(B + 1).fill(0));
  for (let i = 1; i <= n; i++) { const c = COST[items[i - 1].cost], v = items[i - 1].v; for (let b = 0; b <= B; b++) { dp[i][b] = dp[i - 1][b]; if (c <= b && dp[i - 1][b - c] + v > dp[i][b]) dp[i][b] = dp[i - 1][b - c] + v; } }
  const pick = new Set(); let b = B; for (let i = n; i > 0; i--) if (dp[i][b] !== dp[i - 1][b]) { pick.add(items[i - 1].id); b -= COST[items[i - 1].cost]; } return pick;
}
export function rank(data, { method, w, comp, budget }) {
  const r = rng(42), mx = Math.max(...data.map((s) => s.count));
  const val = (s) => method === "count" ? s.count / mx : method === "sev" ? s.sev : method === "rand" ? r() : (({ sev, prog, traf }) => sev + prog + traf)(parts(s, w, comp));
  const rows = data.map((s) => ({ ...s, v: val(s) })).sort((a, b) => b.v - a.v), pick = knapsack(rows, budget);
  return rows.map((x, i) => ({ ...x, rank: i + 1, sel: pick.has(x.id) }));
}
// Plan A: predict round 3 from rounds 1-2 and compare with persistence (needs >= 3 rounds)
export function progression(rounds) {
  if (!rounds || rounds.length < 3) return { available: false };
  const [r1, r2, r3] = rounds, pred = r2 + (r2 - r1);
  return { available: true, pred, persist: r2, obs: r3, errRate: Math.abs(pred - r3), errPersist: Math.abs(r2 - r3), better: Math.abs(pred - r3) < Math.abs(r2 - r3) };
}
