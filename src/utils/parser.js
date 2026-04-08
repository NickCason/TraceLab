function parseCsvLine(line = "") {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseDateParts(dateStr = "") {
  const trimmed = String(dateStr).trim();
  let match = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (match) return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  match = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (match) return { year: Number(match[3]), month: Number(match[1]), day: Number(match[2]) };
  return null;
}

function parseTimeParts(timeStr = "") {
  const [hmsPartRaw, msPartRaw = "0"] = String(timeStr).trim().split(";");
  const hmsPart = hmsPartRaw.trim();
  const match = hmsPart.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);
  const fracPart = (match[4] || "").slice(0, 3).padEnd(3, "0");
  const msPart = String(msPartRaw).trim();
  const msFromSemicolon = /^\d+$/.test(msPart) ? Number(msPart.slice(0, 3).padEnd(3, "0")) : 0;
  const millisecond = msFromSemicolon || Number(fracPart || "0");
  if (hour > 23 || minute > 59 || second > 59 || millisecond > 999) return null;
  return { hour, minute, second, millisecond };
}

export function parseDeterministicTimestamp(dateStr = "", timeStr = "") {
  const date = parseDateParts(dateStr);
  const time = parseTimeParts(timeStr);
  if (!date || !time) return null;
  const { year, month, day } = date;
  const { hour, minute, second, millisecond } = time;
  return new Date(year, month - 1, day, hour, minute, second, millisecond).getTime();
}

export function parseStudio5000CSV(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const meta = {};
  let headerLine = -1;
  let dataStartLine = -1;
  let tagNames = [];

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const rawLine = lines[i];
    const line = rawLine.trimStart();
    const row = parseCsvLine(rawLine);
    const key = row[0]?.trim();
    if (key === "Controller Name:") meta.controller = (row[1] || "").trim();
    if (key === "Trend Name:") meta.trendName = (row[1] || "").trim();
    if (key === "Trend Tags:") meta.tagCount = parseInt((row[1] || "").trim(), 10);
    if (key === "Sample Period:") {
      const sampleCell = row.slice(1).join(",").replace(/"/g, "");
      const m = sampleCell.match(/(\d+)\s*(ms|s)?/i);
      meta.samplePeriod = m ? parseInt(m[1], 10) : 5;
      meta.sampleUnit = (m?.[2] || "ms").toLowerCase();
    }
    if (key === "Start Time:") meta.startTime = row.slice(1).join(",").trim();
    if (key === "Stop Time:") meta.stopTime = row.slice(1).join(",").trim();
    if (line.startsWith("Header:")) {
      headerLine = i;
      tagNames = row.slice(3).map((s) => s.trim());
      dataStartLine = i + 1;
      break;
    }
  }
  if (headerLine === -1) return null;

  const timestamps = [];
  const signals = tagNames.map((name) => ({ name, values: [] }));

  for (let i = dataStartLine; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;
    const parts = parseCsvLine(rawLine);
    if ((parts[0] || "").trim() !== "Data") continue;
    const dateStr = (parts[1] || "").trim();
    const timeStr = (parts[2] || "").trim();
    const ts = parseDeterministicTimestamp(dateStr, timeStr);
    if (ts === null) continue;
    timestamps.push(ts);
    for (let j = 0; j < tagNames.length; j++) {
      const rawValue = (parts[j + 3] || "").trim();
      if (rawValue === "") {
        signals[j].values.push(null);
        continue;
      }
      const val = parseFloat(rawValue);
      signals[j].values.push(Number.isFinite(val) ? val : null);
    }
  }

  signals.forEach((sig) => {
    const uniq = new Set(sig.values.filter((v) => v !== null));
    sig.isDigital = uniq.size <= 2 && [...uniq].every((v) => v === 0 || v === 1 || Math.abs(v) < 0.01 || Math.abs(v - 1) < 0.01);
  });

  return { meta, timestamps, signals, tagNames };
}
