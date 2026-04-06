export function parseStudio5000CSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const meta = {}; let headerLine = -1, dataStartLine = -1, tagNames = [];
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    if (line.startsWith("Controller Name:")) meta.controller = line.split(",")[1]?.replace(/"/g, "").trim();
    if (line.startsWith("Trend Name:")) meta.trendName = line.split(",")[1]?.replace(/"/g, "").trim();
    if (line.startsWith("Trend Tags:")) meta.tagCount = parseInt(line.split(",")[1]?.replace(/"/g, "").trim());
    if (line.startsWith("Sample Period:")) { const m = line.match(/"(\d+)"\s*(ms|s)?/); meta.samplePeriod = m ? parseInt(m[1]) : 5; meta.sampleUnit = m?.[2] || "ms"; }
    if (line.startsWith("Start Time:")) meta.startTime = line.split(",").slice(1).join(",").trim();
    if (line.startsWith("Stop Time:")) meta.stopTime = line.split(",").slice(1).join(",").trim();
    if (line.startsWith("Header:")) { headerLine = i; tagNames = line.split(",").map(s => s.replace(/"/g, "").trim()).slice(3); dataStartLine = i + 1; break; }
  }
  if (headerLine === -1) return null;
  const timestamps = []; const signals = tagNames.map(name => ({ name, values: [] }));
  for (let i = dataStartLine; i < lines.length; i++) {
    const line = lines[i].trim(); if (!line || !line.startsWith("Data")) continue;
    const parts = line.split(","); const dateStr = parts[1]?.trim(); const timeStr = parts[2]?.trim();
    if (!dateStr || !timeStr) continue;
    const [hms, msStr] = timeStr.split(";"); const dt = new Date(`${dateStr} ${hms}`); dt.setMilliseconds(parseInt(msStr || "0")); timestamps.push(dt.getTime());
    for (let j = 0; j < tagNames.length; j++) { const val = parseFloat(parts[j + 3]?.replace(/"/g, "").trim()); signals[j].values.push(isNaN(val) ? null : val); }
  }
  signals.forEach(sig => { const uniq = new Set(sig.values.filter(v => v !== null)); sig.isDigital = uniq.size <= 2 && [...uniq].every(v => v === 0 || v === 1 || Math.abs(v) < 0.01 || Math.abs(v - 1) < 0.01); });
  return { meta, timestamps, signals, tagNames };
}
