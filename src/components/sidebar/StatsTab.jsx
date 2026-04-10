import MarqueeText from "../MarqueeText";
import { computeStats } from "../../utils/stats";
import { getAutoSignalColor } from "../../constants/colors";
import { FONT_DISPLAY, FONT_MONO } from "../../constants/theme";

export default function StatsTab({ t, theme, data, visible, metadata, viewRange, signalStyles, getDisplayName }) {
  return (
    <>
      {data.signals.map((sig, i) => {
        if (!visible[i]) return null;
        const color = signalStyles[i]?.color || getAutoSignalColor(theme, i) || t.sigColors[i % t.sigColors.length];
        const s = computeStats(sig.values, viewRange[0], viewRange[1]);
        return (
          <div key={i} style={{ padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: t.surface, borderLeft: `3px solid ${color}`, boxShadow: t.cardShadow }}>
            <MarqueeText style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.text1, fontFamily: FONT_DISPLAY }}>
              {getDisplayName(i)}
              {metadata[i]?.unit && <span style={{ fontWeight: 400, color: t.text3 }}> [{metadata[i].unit}]</span>}
            </MarqueeText>
            {[["Min", s.min], ["Max", s.max], ["Avg", s.avg], ["Range", s.range]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
                <span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>{l}</span>
                <span style={{ color: t.text2, fontFamily: FONT_MONO, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
