import MarqueeText from "../MarqueeText";
import { getAutoSignalColor } from "../../constants/colors";
import { FONT_DISPLAY, FONT_MONO } from "../../constants/theme";

const UNIT_PRESETS = [
  { label: "°F", value: "°F" }, { label: "°C", value: "°C" }, { label: "K", value: "K" },
  { label: "mm", value: "mm" }, { label: "cm", value: "cm" }, { label: "m", value: "m" }, { label: "in", value: "in" }, { label: "ft", value: "ft" },
  { label: "mm/s", value: "mm/s" }, { label: "m/s", value: "m/s" }, { label: "ft/min", value: "ft/min" }, { label: "RPM", value: "RPM" },
  { label: "psi", value: "psi" }, { label: "bar", value: "bar" }, { label: "kPa", value: "kPa" }, { label: "Pa", value: "Pa" },
  { label: "mA", value: "mA" }, { label: "A", value: "A" }, { label: "V", value: "V" }, { label: "mV", value: "mV" }, { label: "kW", value: "kW" }, { label: "W", value: "W" }, { label: "Ω", value: "Ω" },
  { label: "Hz", value: "Hz" }, { label: "kHz", value: "kHz" },
  { label: "ms", value: "ms" }, { label: "s", value: "s" }, { label: "min", value: "min" },
  { label: "kg", value: "kg" }, { label: "g", value: "g" }, { label: "lb", value: "lb" }, { label: "N", value: "N" }, { label: "N·m", value: "N·m" },
  { label: "L/min", value: "L/min" }, { label: "GPM", value: "GPM" },
  { label: "%", value: "%" }, { label: "°", value: "°" }, { label: "rad", value: "rad" },
  { label: "counts", value: "counts" }, { label: "pulses", value: "pulses" }, { label: "bool", value: "bool" },
];

export default function MetaTab({ t, theme, data, visible, metadata, setMetadata, signalStyles, editingMeta, setEditingMeta }) {
  return (
    <>
      {data.signals.map((sig, i) => {
        const m = metadata[i] || {};
        const editing = editingMeta === i;
        const color = signalStyles[i]?.color || getAutoSignalColor(theme, i) || t.sigColors[i % t.sigColors.length];
        return (
          <div key={i} style={{ padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: t.surface, borderLeft: `3px solid ${color}`, boxShadow: t.cardShadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 6 }}>
              <MarqueeText style={{ fontSize: 12, fontWeight: 700, color: t.text1, fontFamily: FONT_DISPLAY, flex: 1, minWidth: 0 }}>{sig.name}</MarqueeText>
              <button onClick={() => setEditingMeta(editing ? null : i)} style={{ background: "none", border: "none", color: t.accent, fontSize: 13, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 600, flexShrink: 0 }}>
                {editing ? "DONE" : "EDIT"}
              </button>
            </div>
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {["displayName", "description"].map(field => (
                  <input
                    key={field}
                    placeholder={field === "displayName" ? "Display Name" : "Description"}
                    value={m[field] || ""}
                    onChange={e => setMetadata(prev => ({ ...prev, [i]: { ...prev[i], [field]: e.target.value } }))}
                    style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "5px 8px", color: t.text1, fontSize: 12, fontFamily: FONT_MONO, outline: "none" }}
                  />
                ))}
                <div style={{ display: "flex", gap: 3, alignItems: "stretch" }}>
                  <input
                    placeholder="Unit"
                    value={m.unit || ""}
                    onChange={e => setMetadata(prev => ({ ...prev, [i]: { ...prev[i], unit: e.target.value } }))}
                    style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "5px 8px", color: t.text1, fontSize: 12, fontFamily: FONT_MONO, outline: "none", minWidth: 0 }}
                  />
                  <select
                    value=""
                    onChange={e => { if (e.target.value) setMetadata(prev => ({ ...prev, [i]: { ...prev[i], unit: e.target.value } })); }}
                    style={{ width: 36, background: t.panel, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text1, fontSize: 12, fontFamily: FONT_MONO, fontWeight: 700, cursor: "pointer", outline: "none", padding: "0 4px", appearance: "none", textAlign: "center" }}
                    title="Insert unit symbol"
                  >
                    <option value="" disabled>⌄</option>
                    <optgroup label="Temperature">{UNIT_PRESETS.filter(u => ["°F","°C","K"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    <optgroup label="Length">{UNIT_PRESETS.filter(u => ["mm","cm","m","in","ft"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    <optgroup label="Speed">{UNIT_PRESETS.filter(u => ["mm/s","m/s","ft/min","RPM"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    <optgroup label="Pressure">{UNIT_PRESETS.filter(u => ["psi","bar","kPa","Pa"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    <optgroup label="Electrical">{UNIT_PRESETS.filter(u => ["mA","A","V","mV","kW","W","Ω","Hz","kHz"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    <optgroup label="Time">{UNIT_PRESETS.filter(u => ["ms","s","min"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    <optgroup label="Mass / Force">{UNIT_PRESETS.filter(u => ["kg","g","lb","N","N·m"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    <optgroup label="Flow">{UNIT_PRESETS.filter(u => ["L/min","GPM"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    <optgroup label="Other">{UNIT_PRESETS.filter(u => ["%","°","rad","counts","pulses","bool"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                  </select>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>
                {m.displayName && <MarqueeText style={{ color: t.text3 }}>Name: <span style={{ color: t.text2 }}>{m.displayName}</span></MarqueeText>}
                {m.unit && <div>Unit: <span style={{ color: t.text2 }}>{m.unit}</span></div>}
                {m.description && <MarqueeText style={{ marginTop: 2 }}>{m.description}</MarqueeText>}
                {!m.displayName && !m.unit && !m.description && <div style={{ fontStyle: "italic" }}>No metadata</div>}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
