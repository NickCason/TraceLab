import { fmtTsClean } from "../../utils/date";
import { FONT_DISPLAY, FONT_MONO } from "../../constants/theme";

export default function RebaseTab({ t, data, rebaseOffset, rebaseInput, setRebaseInput, applyRebase, clearRebase }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: t.text3, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Timestamp Rebase</div>
      <div style={{ fontSize: 12, color: t.text2, marginBottom: 10, fontFamily: FONT_DISPLAY, lineHeight: 1.5 }}>Redefine the start time. All timestamps shift uniformly.</div>
      <div style={{ fontSize: 12, color: t.text3, marginBottom: 6, fontFamily: FONT_MONO }}>
        Original start: <span style={{ color: t.text1, fontWeight: 600 }}>{fmtTsClean(data.timestamps[0])}</span>
      </div>
      {rebaseOffset !== 0 && (
        <div style={{ fontSize: 12, color: t.warn, marginBottom: 6, fontFamily: FONT_MONO }}>
          Current start: <span style={{ fontWeight: 700 }}>{fmtTsClean(data.timestamps[0] + rebaseOffset)}</span>
        </div>
      )}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>New start (YYYY-MM-DD HH:MM:SS):</div>
        <input
          value={rebaseInput}
          onChange={e => setRebaseInput(e.target.value)}
          placeholder="2026-03-25 08:00:00"
          style={{ width: "100%", boxSizing: "border-box", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "7px 10px", color: t.text1, fontSize: 13, fontFamily: FONT_MONO, outline: "none" }}
        />
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={applyRebase} style={{ flex: 1, padding: "8px 0", fontSize: 12, fontFamily: FONT_DISPLAY, cursor: "pointer", borderRadius: 8, fontWeight: 700, border: `1px solid ${t.warn}44`, background: `${t.warn}18`, color: t.warn }}>APPLY REBASE</button>
        {rebaseOffset !== 0 && (
          <button onClick={clearRebase} style={{ padding: "8px 12px", fontSize: 12, fontFamily: FONT_DISPLAY, cursor: "pointer", borderRadius: 8, fontWeight: 600, border: `1px solid ${t.border}`, background: t.surface, color: t.text3 }}>RESET</button>
        )}
      </div>
      <div style={{ fontSize: 13, color: t.text4, marginTop: 10, fontFamily: FONT_MONO }}>
        Offset: {rebaseOffset >= 0 ? "+" : ""}{rebaseOffset} ms
      </div>
    </div>
  );
}
