import { useEffect, useMemo, useState } from "react";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "../constants/theme";

export default function DerivedPenDialog({ open, mode = "create", theme, signals, groups, defaultGroupIdx, defaultType, initialDraft = null, getDisplayName, onCancel, onCreate }) {
  const t = THEMES[theme];
  const [name, setName] = useState("");
  const [type, setType] = useState(defaultType || "equation");
  const [groupIdx, setGroupIdx] = useState(defaultGroupIdx || 1);
  const [expression, setExpression] = useState("s0 - s1");
  const [source, setSource] = useState(0);
  const [windowSize, setWindowSize] = useState(20);
  const [sourceA, setSourceA] = useState(0);
  const [sourceB, setSourceB] = useState(1);

  useEffect(() => {
    if (!open) return;
    if (initialDraft) {
      setType(initialDraft.type || "equation");
      setGroupIdx(initialDraft.groupIdx || defaultGroupIdx || 1);
      setName(initialDraft.name || "");
      setExpression(initialDraft.expression || "s0 - s1");
      setSource(initialDraft.source ?? 0);
      setWindowSize(initialDraft.window ?? 20);
      setSourceA(initialDraft.sources?.[0] ?? 0);
      setSourceB(initialDraft.sources?.[1] ?? 1);
      return;
    }
    setType(defaultType || "equation");
    setGroupIdx(defaultGroupIdx || 1);
    setName("");
    setExpression("s0 - s1");
    setSource(0);
    setWindowSize(20);
    setSourceA(0);
    setSourceB(1);
  }, [open, defaultType, defaultGroupIdx, initialDraft]);

  const variableLegend = useMemo(
    () => signals.map((_, i) => ({ token: `s${i}`, label: getDisplayName(i), group: groups[i] || 1 })),
    [signals, getDisplayName, groups]
  );

  if (!open) return null;

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 8,
    padding: "6px 8px",
    color: t.text1,
    fontSize: 12,
    fontFamily: FONT_MONO,
    outline: "none",
  };

  const create = () => {
    if (type === "equation" && !expression.trim()) return;
    onCreate({
      name: name.trim(),
      type,
      groupIdx: parseInt(groupIdx, 10),
      expression,
      source: parseInt(source, 10),
      window: parseInt(windowSize, 10),
      sources: [parseInt(sourceA, 10), parseInt(sourceB, 10)],
    });
  };

  const insertToken = (token) => setExpression(prev => (prev ? `${prev} ${token}` : token));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 700, maxWidth: "92vw", maxHeight: "85vh", overflow: "auto", background: t.panel, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: t.cardShadow, padding: 12 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: t.text1, marginBottom: 10 }}>{mode === "edit" ? "Edit Derived Pen" : "Add Derived Pen"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Type</div>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="equation">Equation</option>
              <option value="rolling_avg">Rolling Average</option>
              <option value="difference">Difference</option>
              <option value="sum">Sum</option>
              <option value="ratio">Ratio</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Target Chart Group</div>
            <select value={groupIdx} onChange={(e) => setGroupIdx(e.target.value)} style={inputStyle}>
              {Array.from({ length: 8 }, (_, i) => i + 1).map(g => <option key={g} value={g}>Group {g}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Derived Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional custom name" style={inputStyle} />
          </div>
        </div>

        {type === "equation" && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Equation (s0/s1 tokens + Math functions)</div>
            <textarea value={expression} onChange={(e) => setExpression(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 62 }} />
            <div style={{ fontSize: 11, color: t.text4, marginTop: 4, fontFamily: FONT_DISPLAY }}>Click variables below to insert tokens like <span style={{ fontFamily: FONT_MONO }}>s3</span>. Example: <span style={{ fontFamily: FONT_MONO }}>abs(s0 - s1)</span>.</div>
          </div>
        )}

        {type === "rolling_avg" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Source Signal</div>
              <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
                {signals.map((_, i) => <option key={i} value={i}>{`s${i} — ${getDisplayName(i)}`}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Window: <span style={{ color: t.warn, fontFamily: FONT_MONO }}>{windowSize}</span></div>
              <input type="range" min={2} max={500} value={windowSize} onChange={(e) => setWindowSize(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: t.warn }} />
            </div>
          </div>
        )}

        {(type === "difference" || type === "sum" || type === "ratio") && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Source A</div>
              <select value={sourceA} onChange={(e) => setSourceA(e.target.value)} style={inputStyle}>
                {signals.map((_, i) => <option key={i} value={i}>{`s${i} — ${getDisplayName(i)}`}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Source B</div>
              <select value={sourceB} onChange={(e) => setSourceB(e.target.value)} style={inputStyle}>
                {signals.map((_, i) => <option key={i} value={i}>{`s${i} — ${getDisplayName(i)}`}</option>)}
              </select>
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Variables (all charts/signals)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 150, overflow: "auto", border: `1px solid ${t.borderSubtle}`, borderRadius: 8, padding: 6, marginBottom: 8 }}>
          {variableLegend.map(v => (
            <button key={v.token} onClick={() => insertToken(v.token)} style={{ border: `1px solid ${t.border}`, background: t.surface, color: t.text2, borderRadius: 6, fontSize: 11, fontFamily: FONT_MONO, padding: "2px 6px", cursor: "pointer" }}>
              {v.token}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Legend</div>
        <div style={{ maxHeight: 160, overflow: "auto", border: `1px solid ${t.borderSubtle}`, borderRadius: 8, padding: 6, marginBottom: 10 }}>
          {variableLegend.map(v => (
            <div key={v.token} style={{ fontSize: 11, color: t.text2, fontFamily: FONT_MONO, padding: "1px 0" }}>
              <span style={{ color: t.accent, fontWeight: 700 }}>{v.token}</span> = {v.label} <span style={{ color: t.text4 }}>(Group {v.group})</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button onClick={onCancel} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface, color: t.text3, fontFamily: FONT_DISPLAY, cursor: "pointer" }}>Cancel</button>
          <button onClick={create} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${t.accent}66`, background: t.accentDim, color: t.accent, fontFamily: FONT_DISPLAY, fontWeight: 700, cursor: "pointer" }}>{mode === "edit" ? "Save Derived" : "Create Derived"}</button>
        </div>
      </div>
    </div>
  );
}
