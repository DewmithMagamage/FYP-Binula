import { useMemo, useRef, useState } from "react";
import { COST, METHODS, lv, parts, rank, progression } from "./logic.js";
import { demoMode, loadSections, uploadObservations, sendFeedback } from "./api.js";

const TABS = [["up", "1 · Upload and analyse"], ["rank", "2 · Priority dashboard"], ["ev", "3 · Evidence"], ["prog", "4 · Progression"]];

function Upload({ s, set, run, files, setFiles, status }) {
  const fi = useRef();
  const take = (fl) => [...fl].filter((f) => f.type.startsWith("image/")).slice(0, 6);
  return (<section className="card"><h2>Upload drone frames and set the analysis</h2>
    <div className="drop" tabIndex={0} role="button" onClick={() => fi.current.click()} onKeyDown={(e) => e.key === "Enter" && fi.current.click()}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFiles(take(e.dataTransfer.files)); }}>
      <strong>Drag and drop drone frames</strong> or click to choose<input ref={fi} type="file" accept="image/*" multiple hidden onChange={(e) => setFiles(take(e.target.files))} /></div>
    <div className="thumbs">{files.map((f, i) => <img key={i} alt="selected frame" src={URL.createObjectURL(f)} />)}</div>
    <div className="grid" style={{ marginTop: 14 }}>
      <div><label>Route</label><select value={s.route} onChange={(e) => set({ route: e.target.value })}>{["R1", "R2", "R3", "R4"].map((o) => <option key={o}>{o}</option>)}</select></div>
      <div><label>Survey round</label><select value={s.round} onChange={(e) => set({ round: e.target.value })}>{["Round 1", "Round 2", "Round 3"].map((o) => <option key={o}>{o}</option>)}</select></div>
      <div><label>Budget (LKR million)</label><input type="number" min="0" value={s.budget} onChange={(e) => set({ budget: +e.target.value || 0 })} /></div></div>
    <p style={{ marginTop: 14 }}><button className="btn p" onClick={run}>Run analysis</button></p>
    {status && <p className="mut">{typeof status === "string" ? status : JSON.stringify(status)}</p>}</section>);
}

function Rank({ s, set, rows }) {
  const used = rows.filter((r) => r.sel).reduce((a, r) => a + COST[r.cost], 0), P = s.comp === "prog" ? "Progression" : "Risk";
  const sl = (k, l) => <div className="sl"><span>{l}</span><input type="range" min="0" max="100" value={Math.round(s.w[k] * 100)} onChange={(e) => set({ w: { ...s.w, [k]: e.target.value / 100 } })} /><span>{Math.round(s.w[k] * 100)}</span></div>;
  return (<section className="card"><h2>Ranked sections</h2><div className="grid">
    <div><label>Ranking method</label><select value={s.method} onChange={(e) => set({ method: e.target.value })}>{Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
    <div><label>Progress component</label><select value={s.comp} onChange={(e) => set({ comp: e.target.value })}><option value="prog">Progression estimate (Plan A)</option><option value="risk">Risk indicator (Plan B)</option></select></div>
    <div><label>Budget (LKR million)</label><input type="number" min="0" value={s.budget} onChange={(e) => set({ budget: +e.target.value || 0 })} /></div></div>
    <h3>Weights (normalised automatically)</h3>{sl("sev", "Severity")}{sl("prog", P)}{sl("traf", "Traffic importance")}
    <p className="mut">Budget used: <strong>{used} of {s.budget}</strong> LKR million · selected {rows.filter((r) => r.sel).length} of {rows.length}</p>
    <div className="meter"><i style={{ width: Math.min(100, s.budget ? (used / s.budget) * 100 : 0) + "%" }} /></div>
    <div className="scroll"><table><thead><tr><th>#</th><th>Section</th><th>Severity</th><th>{P}</th><th>Traffic</th><th>Cost</th><th>Score</th><th>Selected</th></tr></thead><tbody>
      {rows.map((r) => { const p = s.comp === "prog" ? r.prog : r.risk; return (<tr key={r.id} className={"row " + (r.sel ? "sel" : "")} onClick={() => set({ sel: r.id, tab: "ev" })}>
        <td>{r.rank}</td><td>{r.name}{r.flagged ? " ⚠" : ""}<br /><span className="mut">{r.route}</span></td><td><span className={"pill " + lv(r.sev)}>{lv(r.sev)}</span></td><td><span className={"pill " + lv(p)}>{lv(p)}</span></td>
        <td>{["", "Low", "Medium", "High"][r.traffic]}</td><td>{r.cost} · {COST[r.cost]}</td><td>{r.v.toFixed(2)}</td><td>{r.sel ? "✓" : "–"}</td></tr>); })}</tbody></table></div>
    <p className="mut">Click a row for evidence. Selection is a 0/1 knapsack over cost categories; costs are illustrative placeholders.</p></section>);
}

function Evidence({ s, set, rows, dec, setDec }) {
  const r = rows.find((x) => x.id === s.sel) || rows[0], p = parts(r, s.w, s.comp), tot = p.sev + p.prog + p.traf || 1, d = dec[r.id] || {}, [note, setNote] = useState(d.note || "");
  const items = [["Damage severity", p.sev], ["Progression / risk", p.prog], ["Traffic importance", p.traf]], top = [...items].sort((a, b) => b[1] - a[1])[0][0].toLowerCase();
  const save = (decision) => { setDec({ ...dec, [r.id]: { decision, note } }); sendFeedback(r.id, decision, note); };
  return (<section className="card"><h2>{r.name} · {r.route}</h2>
    <select value={r.id} onChange={(e) => { set({ sel: e.target.value }); setNote((dec[e.target.value] || {}).note || ""); }}>{rows.map((x) => <option key={x.id} value={x.id}>{x.name} (rank {x.rank})</option>)}</select>
    <h3>Detections</h3><div className="scroll"><table><thead><tr><th>Type</th><th>Area (m²)</th><th>Confidence</th></tr></thead><tbody>{r.damage.map((x, i) => <tr key={i}><td>{x.type}</td><td>{x.area_m2}</td><td>{x.conf.toFixed(2)}</td></tr>)}</tbody></table></div>
    <h3>Priority score breakdown</h3>{items.map(([l, v]) => <div className="bar" key={l}><span>{l}</span><b style={{ width: Math.max(2, (v / tot) * 100) + "%" }} /><span>{v.toFixed(2)}</span></div>)}
    <p>{r.name} ranks <strong>#{r.rank}</strong> under “{METHODS[s.method]}”, mainly because of {top}. It costs {COST[r.cost]} LKR million and is {r.sel ? <strong>selected</strong> : "not selected"} within the {s.budget} million budget. This describes the score; it is not proof of cause.</p>
    {(r.flagged || r.conf < 0.7) && <div className="flag">⚠ Low confidence ({r.conf.toFixed(2)}): flagged for human review.</div>}
    <label>Reviewer note</label><textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} />
    <p style={{ marginTop: 10 }}><button className="btn ok" onClick={() => save("accept")}>Accept</button> <button className="btn bad" onClick={() => save("reject")}>Reject</button> <span className="mut">{d.decision ? "Saved: " + d.decision : "No decision saved"}</span></p></section>);
}

function Progress({ s, set, rows }) {
  const r = rows.find((x) => x.id === s.sel) || rows[0], pr = progression(r.rounds), W = 320, H = 150, mx = Math.max(...r.rounds, pr.pred || 0) * 1.15 || 1;
  const X = (i) => 40 + i * 110, Y = (v) => H - 25 - (v / mx) * (H - 45), pts = r.rounds.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  const ok = rows.filter((x) => progression(x.rounds).available), wins = ok.filter((x) => progression(x.rounds).better).length;
  return (<section className="card"><h2>Damage progression across survey rounds (Plan A)</h2>
    <select value={r.id} onChange={(e) => set({ sel: e.target.value })}>{rows.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
    {!pr.available ? <div className="flag">Fewer than three survey rounds: progression is unavailable. Use the risk indicator (Plan B), which is not a forecast.</div> : (<>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Damage area by round"><polyline fill="none" stroke="var(--pri)" strokeWidth="2" points={pts} />
        {r.rounds.map((v, i) => <g key={i}><circle cx={X(i)} cy={Y(v)} r="4" fill="var(--pri)" /><text x={X(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--mut)">Round {i + 1}</text><text x={X(i)} y={Y(v) - 8} fontSize="10" textAnchor="middle" fill="var(--tx)">{v}</text></g>)}
        <circle cx={X(2)} cy={Y(pr.pred)} r="4" fill="none" stroke="var(--warn)" strokeWidth="2" /><text x={X(2) + 8} y={Y(pr.pred) + 3} fontSize="9" fill="var(--warn)">rate estimate {pr.pred.toFixed(1)}</text></svg>
      <div className="scroll"><table><thead><tr><th>Method (predict round 3 from rounds 1-2)</th><th>Predicted area (m²)</th><th>Observed</th><th>Absolute error</th></tr></thead><tbody>
        <tr><td>Rate estimate (proposed)</td><td>{pr.pred.toFixed(2)}</td><td>{pr.obs}</td><td>{pr.errRate.toFixed(2)}</td></tr>
        <tr><td>Persistence baseline</td><td>{pr.persist.toFixed(2)}</td><td>{pr.obs}</td><td>{pr.errPersist.toFixed(2)}</td></tr></tbody></table></div>
      <p>For {r.name} the rate estimate {pr.better ? "has lower" : "does not have lower"} error than persistence. Across {ok.length} sections it was better in {wins}.</p></>)}
    <p className="mut">Values are illustrative sample areas, not measurements. Real validation needs matched damage from three drone surveys and confidence intervals; a time-to-failure figure is never claimed.</p></section>);
}

export default function App() {
  const [s, setS] = useState({ tab: "up", route: "R1", round: "Round 3", budget: 20, method: "proposed", comp: "prog", w: { sev: 0.4, prog: 0.35, traf: 0.25 }, sel: "A" });
  const [data, setData] = useState(null), [files, setFiles] = useState([]), [status, setStatus] = useState(""), [dec, setDec] = useState({});
  const set = (p) => setS((o) => ({ ...o, ...p }));
  const run = async () => { try { setStatus(await uploadObservations(files, s.route, s.round)); const d = await loadSections(s.budget); setData(d.sections); set({ tab: "rank" }); } catch (e) { setStatus("Error: " + e.message); } };
  const rows = useMemo(() => (data ? rank(data, s) : null), [data, s.method, s.comp, s.budget, s.w]);
  const body = s.tab === "up" ? <Upload {...{ s, set, run, files, setFiles, status }} /> : !rows ? <section className="card"><p>No analysis yet. Run an analysis on screen 1.</p></section>
    : s.tab === "rank" ? <Rank {...{ s, set, rows }} /> : s.tab === "ev" ? <Evidence {...{ s, set, rows, dec, setDec }} /> : <Progress {...{ s, set, rows }} />;
  return (<div className="wrap"><header><h1>Road Maintenance Decision Support</h1><span className="badge">{demoMode ? "Demo mode · sample data, not model output" : "Connected to API"}</span></header>
    <div className="notice"><strong>Decision support only.</strong> Rankings are screening evidence. Final maintenance decisions rest with qualified officers.</div>
    <nav className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={s.tab === k} onClick={() => set({ tab: k })}>{l}</button>)}</nav>{body}</div>);
}
