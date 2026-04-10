/**
 * buildSteps(t) — returns the 17-step tutorial array for TraceLab.
 * t: THEMES[theme] object — provides accent, bg, panel, border, text1/2/3, green, cursor2 etc.
 * SVG colors are injected as template literals so they follow dark/light theme.
 */
export function buildSteps(t) {
  return [
    /* 1 — Welcome */
    {
      target: null,
      title: 'Welcome to TraceLab',
      desc: 'TraceLab is a fast, browser-based viewer for PLC trend data. Load a Studio 5000 CSV, explore signals across grouped chart panes, use cursors, overlays, and derived values to inspect behavior, and export annotated snapshots — no install, just open and go.',
      prefer: null,
      svg: `<svg viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="74" rx="6" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <line x1="28" y1="72" x2="260" y2="72" stroke="${t.border}" stroke-width="1"/>
        <line x1="28" y1="16" x2="28" y2="72" stroke="${t.border}" stroke-width="1"/>
        <path d="M28 62 C55 62 65 30 95 30 C125 30 138 54 168 50 C198 46 220 34 260 30" stroke="${t.accent}" stroke-width="2" fill="none"/>
        <path d="M28 68 C60 66 85 48 115 44 C145 40 160 58 195 56 C218 55 242 46 260 42" stroke="${t.green}" stroke-width="1.5" fill="none"/>
        <text x="144" y="86" font-size="8" fill="${t.text3}" text-anchor="middle" font-family="JetBrains Mono, monospace">TRACELAB</text>
      </svg>`,
    },

    /* 2 — Loading a CSV */
    {
      target: '#btn-load-csv',
      title: 'Loading a CSV',
      desc: 'Click Load CSV to open a Studio 5000 trend export. All signal columns, timestamps, and tag metadata are read automatically. You can also drag-and-drop a CSV file anywhere on the window.',
      prefer: 'bottom',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="70" y="10" width="60" height="50" rx="5" stroke="${t.border}" stroke-width="1.5" fill="${t.bg}"/>
        <polyline points="110,10 130,10 130,28 110,28" stroke="${t.accent}" stroke-width="1" fill="${t.accentDim}"/>
        <line x1="80" y1="36" x2="122" y2="36" stroke="${t.border}" stroke-width="1"/>
        <line x1="80" y1="42" x2="118" y2="42" stroke="${t.border}" stroke-width="1"/>
        <line x1="80" y1="48" x2="110" y2="48" stroke="${t.border}" stroke-width="1"/>
        <text x="86" y="23" font-size="8" fill="${t.accent}" font-family="JetBrains Mono, monospace">.CSV</text>
        <line x1="138" y1="35" x2="158" y2="35" stroke="${t.accent}" stroke-width="1.5"/>
        <polygon points="158,30 168,35 158,40" fill="${t.accent}"/>
        <rect x="172" y="16" width="44" height="38" rx="4" stroke="${t.green}" stroke-width="1.5" fill="${t.bg}"/>
        <line x1="179" y1="26" x2="208" y2="26" stroke="${t.green}" stroke-width="1"/>
        <line x1="179" y1="32" x2="204" y2="32" stroke="${t.green}" stroke-width="1"/>
        <line x1="179" y1="38" x2="206" y2="38" stroke="${t.green}" stroke-width="1"/>
        <line x1="179" y1="44" x2="200" y2="44" stroke="${t.green}" stroke-width="1"/>
      </svg>`,
    },

    /* 3 — Signals Visibility & Reorder */
    {
      target: '#tab-signals',
      title: 'Signals — Visibility & Reorder',
      desc: 'The Signals tab lists every loaded tag. Click the colored square to toggle a signal on or off. Drag signal cards between Group panels to reorganize them into separate chart panes.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="8" width="120" height="22" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="16" y="14" width="10" height="10" rx="2" fill="${t.accent}" opacity="0.9"/>
        <line x1="32" y1="19" x2="90" y2="19" stroke="${t.text2}" stroke-width="1"/>
        <text x="95" y="22" font-size="8" fill="${t.green}" font-family="JetBrains Mono, monospace">●</text>
        <rect x="10" y="34" width="120" height="22" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="16" y="40" width="10" height="10" rx="2" fill="${t.text4}" opacity="0.5"/>
        <line x1="32" y1="45" x2="90" y2="45" stroke="${t.text3}" stroke-width="1" stroke-dasharray="3 2"/>
        <text x="95" y="48" font-size="8" fill="${t.text4}" font-family="JetBrains Mono, monospace">○</text>
        <rect x="10" y="60" width="120" height="22" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="16" y="66" width="10" height="10" rx="2" fill="${t.cursor2}" opacity="0.9"/>
        <line x1="32" y1="71" x2="90" y2="71" stroke="${t.cursor2}" stroke-width="1"/>
        <text x="95" y="74" font-size="8" fill="${t.green}" font-family="JetBrains Mono, monospace">●</text>
        <line x1="152" y1="20" x2="270" y2="20" stroke="${t.accent}" stroke-width="1.5"/>
        <line x1="152" y1="45" x2="270" y2="45" stroke="${t.text3}" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>
        <line x1="152" y1="71" x2="270" y2="71" stroke="${t.cursor2}" stroke-width="1.5"/>
      </svg>`,
    },

    /* 4 — Signals Style Editing */
    {
      target: '#signal-card-0',
      title: 'Signals — Style Editing',
      desc: "Click the gear/swatch on any signal card to open style options: change color, line dash pattern, stroke weight, or opacity. Double-click a signal's label to rename it inline. Changes sync with the Meta tab.",
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="12" width="130" height="58" rx="6" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="16" y="18" width="10" height="10" rx="2" fill="${t.accent}"/>
        <line x1="32" y1="23" x2="96" y2="23" stroke="${t.accent}" stroke-width="1.5"/>
        <rect x="102" y="18" width="28" height="10" rx="3" fill="${t.accentDim}" stroke="${t.accentBorder}" stroke-width="1"/>
        <text x="116" y="26" font-size="7" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">style</text>
        <line x1="16" y1="38" x2="130" y2="38" stroke="${t.borderSubtle}" stroke-width="1"/>
        <circle cx="22" cy="52" r="5" fill="${t.accent}" opacity="0.8"/>
        <circle cx="34" cy="52" r="5" fill="${t.green}" opacity="0.8"/>
        <circle cx="46" cy="52" r="5" fill="${t.cursor2}" opacity="0.8"/>
        <circle cx="58" cy="52" r="5" fill="${t.isolate}" opacity="0.8"/>
        <line x1="75" y1="52" x2="110" y2="52" stroke="${t.text2}" stroke-width="1.5"/>
        <line x1="118" y1="52" x2="130" y2="52" stroke="${t.text2}" stroke-width="1.5" stroke-dasharray="3 2"/>
        <line x1="160" y1="20" x2="270" y2="20" stroke="${t.accent}" stroke-width="2"/>
        <line x1="160" y1="40" x2="270" y2="40" stroke="${t.green}" stroke-width="1.5" stroke-dasharray="6 3"/>
        <line x1="160" y1="60" x2="270" y2="60" stroke="${t.cursor2}" stroke-width="1"/>
      </svg>`,
    },

    /* 5 — Chart Cursor & Navigation */
    {
      target: '#chart-pane-0',
      title: 'Chart Cursor & Navigation',
      desc: 'Hover over the chart to move the cursor — signal values snap to the nearest sample and appear as pills above each line. Scroll to zoom in/out. Drag to pan. The time axis updates as you navigate.',
      prefer: 'top',
      allowInteract: true,
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="64" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 55 C55 55 70 22 100 22 C130 22 145 50 175 46 C205 42 225 30 265 26" stroke="${t.accent}" stroke-width="2" fill="none"/>
        <path d="M20 62 C55 60 80 40 110 38 C140 36 158 55 192 52 C215 50 242 42 265 38" stroke="${t.green}" stroke-width="1.5" fill="none"/>
        <line x1="160" y1="12" x2="160" y2="68" stroke="${t.cursor1}" stroke-width="1" stroke-dasharray="3 2" opacity="0.7"/>
        <circle cx="160" cy="37" r="3" fill="${t.accent}"/>
        <circle cx="160" cy="47" r="3" fill="${t.green}"/>
        <rect x="142" y="8" width="36" height="10" rx="3" fill="${t.accent}" opacity="0.9"/>
        <text x="160" y="15" font-size="7" fill="${t.bg}" text-anchor="middle" font-family="JetBrains Mono, monospace">2.45</text>
      </svg>`,
    },

    /* 6 — Edge Values & Peaks */
    {
      targets: ['#btn-edges', '#chart-pane-0'],
      title: 'Edge Values & Peaks',
      desc: 'Edges shows the signal value at the left and right edges of the current view — useful when signals enter or exit the visible range. Peaks marks the per-signal min and max within the current view.',
      prefer: 'bottom',
      allowInteract: true,
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="64" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 55 C60 55 80 22 115 22 C150 22 165 50 200 46 C225 43 245 32 265 28" stroke="${t.accent}" stroke-width="2" fill="none"/>
        <text x="22" y="51" font-size="7" fill="${t.warn}" font-family="JetBrains Mono, monospace">54.2</text>
        <text x="238" y="24" font-size="7" fill="${t.warn}" font-family="JetBrains Mono, monospace">28.1</text>
        <circle cx="115" cy="22" r="4" fill="none" stroke="${t.accent}" stroke-width="1.5"/>
        <text x="115" y="16" font-size="6" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">MAX</text>
        <circle cx="200" cy="46" r="4" fill="none" stroke="${t.text3}" stroke-width="1.5"/>
        <text x="200" y="58" font-size="6" fill="${t.text3}" text-anchor="middle" font-family="JetBrains Mono, monospace">MIN</text>
      </svg>`,
    },

    /* 7 — Delta Mode */
    {
      target: '#btn-delta',
      title: 'Delta Mode',
      desc: 'Delta Mode places two independent cursors. Click to set cursor 1, right-click (or second click) to set cursor 2. The time difference and value difference between cursors appear as a readout in the chart.',
      prefer: 'bottom',
      allowInteract: true,
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="64" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 55 C60 55 80 25 115 22 C150 19 165 50 200 46 C225 43 245 30 265 26" stroke="${t.accent}" stroke-width="2" fill="none"/>
        <line x1="100" y1="12" x2="100" y2="68" stroke="${t.cursor1}" stroke-width="1" stroke-dasharray="3 2" opacity="0.8"/>
        <line x1="180" y1="12" x2="180" y2="68" stroke="${t.cursor2}" stroke-width="1" stroke-dasharray="3 2" opacity="0.8"/>
        <circle cx="100" cy="23" r="3" fill="${t.cursor1}"/>
        <circle cx="180" cy="45" r="3" fill="${t.cursor2}"/>
        <path d="M100 14 L180 14" stroke="${t.text3}" stroke-width="1"/>
        <text x="140" y="12" font-size="7" fill="${t.cursor2}" text-anchor="middle" font-family="JetBrains Mono, monospace">Δt = 0.8s</text>
        <path d="M182 23 L182 45" stroke="${t.cursor2}" stroke-width="1"/>
        <text x="210" y="36" font-size="7" fill="${t.cursor2}" font-family="JetBrains Mono, monospace">Δ = 22.1</text>
      </svg>`,
    },

    /* 8 — Groups & Panes */
    {
      target: '#group-panel-1',
      title: 'Groups & Panes',
      desc: 'Signals are organized into Groups — each group gets its own chart pane. Drag a signal card into a different Group panel to move it. Double-click a group name to rename it.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="30" rx="4" stroke="${t.accent}44" stroke-width="1" fill="${t.bg}"/>
        <rect x="8" y="42" width="264" height="30" rx="4" stroke="${t.cursor2}44" stroke-width="1" fill="${t.bg}"/>
        <text x="15" y="19" font-size="7" fill="${t.accent}" font-family="JetBrains Mono, monospace">GROUP A</text>
        <path d="M20 32 C60 32 80 15 115 14 C148 13 165 28 264 26" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
        <text x="15" y="53" font-size="7" fill="${t.cursor2}" font-family="JetBrains Mono, monospace">GROUP B</text>
        <path d="M20 65 C55 65 75 52 110 50 C145 48 165 62 264 58" stroke="${t.cursor2}" stroke-width="1.5" fill="none"/>
        <line x1="8" y1="38" x2="272" y2="38" stroke="${t.border}" stroke-width="1"/>
      </svg>`,
    },

    /* 9 — Derived Signals — Adding */
    {
      target: '#btn-add-derived-0',
      title: 'Derived Signals — Adding One',
      desc: 'Click + Derived in the chart pane header to open the derived signal dialog. You can create a new signal as a math expression, rolling average, difference, ratio, or other combination of loaded signals — and manage it as a new pen.',
      prefer: 'top',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="18" rx="3" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="16" y="20" font-size="8" fill="${t.accent}" font-family="JetBrains Mono, monospace" font-weight="700">GROUP A</text>
        <rect x="200" y="11" width="64" height="12" rx="3" fill="${t.accent}22" stroke="${t.accent}66" stroke-width="1"/>
        <text x="232" y="20" font-size="8" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700">+ Derived</text>
        <rect x="8" y="30" width="264" height="42" rx="3" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 64 C60 64 80 38 115 38 C148 38 165 60 264 55" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
        <path d="M20 70 C55 68 80 52 264 48" stroke="${t.green}" stroke-width="1.5" stroke-dasharray="5 3" fill="none"/>
      </svg>`,
    },

    /* 10 — Derived Signals — The Dialog */
    {
      target: null,
      title: 'Derived Signals — The Dialog',
      desc: 'In the dialog, pick a type (Equation, Difference, Rolling Avg, etc.) then configure its parameters. Equation mode supports token syntax: s0, s1 ... for each loaded signal, plus standard math like avg(s0), abs(s0 - s1). Once added, edit or delete a derived signal from its signal card popover.',
      prefer: null,
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="8" width="220" height="64" rx="6" stroke="${t.border}" stroke-width="1" fill="${t.panel}"/>
        <text x="140" y="22" font-size="9" fill="${t.text2}" text-anchor="middle" font-family="JetBrains Mono, monospace">Add Derived Signal</text>
        <rect x="42" y="28" width="196" height="16" rx="3" fill="${t.bg}" stroke="${t.border}" stroke-width="1"/>
        <text x="50" y="39" font-size="8" fill="${t.accent}" font-family="JetBrains Mono, monospace">s0 - s1</text>
        <line x1="42" y1="50" x2="238" y2="50" stroke="${t.border}" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>
        <rect x="42" y="55" width="60" height="12" rx="3" fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>
        <rect x="108" y="55" width="60" height="12" rx="3" fill="${t.accent}" stroke="${t.accent}" stroke-width="1"/>
        <text x="72" y="63" font-size="7" fill="${t.text2}" text-anchor="middle" font-family="JetBrains Mono, monospace">Cancel</text>
        <text x="138" y="63" font-size="7" fill="${t.bg}" text-anchor="middle" font-family="JetBrains Mono, monospace">Add</text>
      </svg>`,
    },

    /* 11 — References — Adding */
    {
      target: '#btn-add-reference-0',
      title: 'References — Adding One',
      desc: 'Click + Reference in the chart pane header to add a horizontal line, horizontal band, vertical sample line, or vertical sample band overlay. Reference overlays are stored per Group.',
      prefer: 'top',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="264" height="18" rx="3" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
  <text x="16" y="20" font-size="8" fill="${t.accent}" font-family="JetBrains Mono, monospace" font-weight="700">GROUP A</text>
  <rect x="172" y="11" width="92" height="12" rx="3" fill="${t.green}22" stroke="${t.green}66" stroke-width="1"/>
  <text x="218" y="20" font-size="8" fill="${t.green}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700">+ Reference</text>
  <rect x="8" y="30" width="264" height="42" rx="3" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
  <path d="M20 58 C60 58 80 36 115 36 C148 36 165 56 264 51" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
  <line x1="20" y1="47" x2="264" y2="47" stroke="${t.warn}" stroke-width="1" stroke-dasharray="4 3"/>
  <rect x="20" y="41" width="244" height="9" rx="1" fill="${t.warn}" opacity="0.10"/>
  <line x1="140" y1="32" x2="140" y2="70" stroke="${t.accent}" stroke-width="1" stroke-dasharray="3 2" opacity="0.75"/>
  <rect x="185" y="32" width="22" height="38" rx="1" fill="${t.green}" opacity="0.12"/>
  <line x1="185" y1="32" x2="185" y2="70" stroke="${t.green}" stroke-width="1" opacity="0.65"/>
  <line x1="207" y1="32" x2="207" y2="70" stroke="${t.green}" stroke-width="1" opacity="0.65"/>
</svg>`,
    },

    /* 12 — References — Configuring */
    {
      target: '#overlays-section-1',
      title: 'References — Configuring',
      desc: 'The OVERLAYS section in each Group panel lists all reference overlays for that pane. Set the label, value, axis (horizontal Y or vertical sample), color, line vs band, and dashed toggle — all live.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="130" height="64" rx="5" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="16" y="20" font-size="7" fill="${t.text3}" font-weight="700" font-family="JetBrains Mono, monospace">OVERLAYS (1)</text>
        <rect x="14" y="26" width="116" height="22" rx="3" fill="${t.surface}" stroke="${t.borderSubtle}" stroke-width="1"/>
        <rect x="18" y="30" width="8" height="8" rx="1" fill="${t.warn}" opacity="0.7"/>
        <rect x="30" y="30" width="42" height="8" rx="2" fill="${t.inputBg}" stroke="${t.inputBorder}" stroke-width="0.5"/>
        <text x="34" y="37" font-size="6" fill="${t.text2}" font-family="JetBrains Mono, monospace">Limit</text>
        <rect x="76" y="30" width="24" height="8" rx="2" fill="${t.inputBg}" stroke="${t.inputBorder}" stroke-width="0.5"/>
        <text x="80" y="37" font-size="6" fill="${t.text2}" font-family="JetBrains Mono, monospace">100</text>
        <rect x="104" y="30" width="22" height="8" rx="2" fill="${t.red}14" stroke="${t.red}55" stroke-width="0.5"/>
        <text x="115" y="37" font-size="8" fill="${t.red}" text-anchor="middle" font-family="JetBrains Mono, monospace">×</text>
        <text x="18" y="60" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">H Line  ·  Y axis  ·  dashed</text>
        <line x1="150" y1="40" x2="270" y2="40" stroke="${t.warn}" stroke-width="1" stroke-dasharray="4 3"/>
        <rect x="150" y="34" width="120" height="12" rx="2" fill="${t.warn}" opacity="0.08"/>
        <path d="M150 65 C185 65 200 38 235 36 C258 35 262 44 270 42" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
      </svg>`,
    },

    /* 13 — Comparison Mode — Loading */
    {
      target: '#btn-add-csv',
      title: 'Comparison Mode — Loading',
      desc: 'With a CSV already loaded, click + CSV to load a second trend file. TraceLab will ask whether to merge the signals into the current dataset or open it as a Comparison dataset in its own chart lane.',
      prefer: 'bottom',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="14" width="52" height="52" rx="5" stroke="${t.border}" stroke-width="1.5" fill="${t.bg}"/>
        <text x="46" y="32" font-size="7" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">.CSV</text>
        <line x1="30" y1="40" x2="62" y2="40" stroke="${t.border}" stroke-width="1"/>
        <line x1="30" y1="46" x2="60" y2="46" stroke="${t.border}" stroke-width="1"/>
        <line x1="30" y1="52" x2="55" y2="52" stroke="${t.border}" stroke-width="1"/>
        <text x="92" y="44" font-size="16" fill="${t.green}" text-anchor="middle" font-family="JetBrains Mono, monospace">+</text>
        <rect x="110" y="14" width="52" height="52" rx="5" stroke="${t.green}" stroke-width="1.5" fill="${t.bg}"/>
        <text x="136" y="32" font-size="7" fill="${t.green}" text-anchor="middle" font-family="JetBrains Mono, monospace">.CSV</text>
        <line x1="120" y1="40" x2="152" y2="40" stroke="${t.green}" stroke-width="1" opacity="0.7"/>
        <line x1="120" y1="46" x2="148" y2="46" stroke="${t.green}" stroke-width="1" opacity="0.7"/>
        <line x1="120" y1="52" x2="144" y2="52" stroke="${t.green}" stroke-width="1" opacity="0.7"/>
        <rect x="172" y="20" width="90" height="40" rx="6" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="217" y="34" font-size="7" fill="${t.text2}" text-anchor="middle" font-family="JetBrains Mono, monospace">How to import?</text>
        <rect x="178" y="40" width="78" height="12" rx="3" fill="${t.accent}22" stroke="${t.accent}55" stroke-width="1"/>
        <text x="217" y="48" font-size="6.5" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">Comparison</text>
      </svg>`,
    },

    /* 14 — Comparison Mode — Navigating */
    {
      target: '#sidebar-comparison-tabs',
      title: 'Comparison Mode — Navigating',
      desc: "In Comparison mode, an Original / Comparison tab strip appears in the sidebar. Switch tabs to view and control each dataset's signals independently. Both datasets are charted in separate pane lanes.",
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="18" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="8" y="8" width="130" height="18" rx="4" fill="${t.accent}22"/>
        <text x="73" y="20" font-size="8" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">Original</text>
        <text x="201" y="20" font-size="8" fill="${t.green}" text-anchor="middle" font-family="JetBrains Mono, monospace">Comparison</text>
        <line x1="138" y1="8" x2="138" y2="26" stroke="${t.border}" stroke-width="1"/>
        <rect x="8" y="30" width="264" height="20" rx="2" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M15 44 C55 44 75 34 110 34 C145 34 165 42 264 40" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
        <rect x="8" y="54" width="264" height="20" rx="2" stroke="${t.green}44" stroke-width="1" fill="${t.bg}"/>
        <path d="M15 68 C50 66 80 56 264 58" stroke="${t.green}" stroke-width="1.5" stroke-dasharray="5 3" fill="none"/>
      </svg>`,
    },

    /* 15 — Meta Tab */
    {
      target: '#tab-meta',
      title: 'Meta Tab',
      desc: 'The Meta tab is where you customize how signals are presented — edit display names, set units, and add descriptions for any tag. Changes apply immediately across the chart panes.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="8" width="260" height="64" rx="5" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="18" y="22" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">Trend Name</text>
        <text x="100" y="22" font-size="7" fill="${t.text1}" font-family="JetBrains Mono, monospace">Drive_Test_03</text>
        <line x1="18" y1="26" x2="262" y2="26" stroke="${t.borderSubtle}" stroke-width="1"/>
        <text x="18" y="36" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">Scan Rate</text>
        <text x="100" y="36" font-size="7" fill="${t.text1}" font-family="JetBrains Mono, monospace">10 ms</text>
        <line x1="18" y1="40" x2="262" y2="40" stroke="${t.borderSubtle}" stroke-width="1"/>
        <text x="18" y="50" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">Unit [0]</text>
        <rect x="97" y="44" width="50" height="10" rx="2" fill="${t.inputBg}" stroke="${t.inputBorder}" stroke-width="0.5"/>
        <text x="100" y="51" font-size="7" fill="${t.text1}" font-family="JetBrains Mono, monospace">RPM</text>
        <line x1="18" y1="58" x2="262" y2="58" stroke="${t.borderSubtle}" stroke-width="1"/>
        <text x="18" y="67" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">Display [0]</text>
        <rect x="97" y="61" width="80" height="10" rx="2" fill="${t.inputBg}" stroke="${t.inputBorder}" stroke-width="0.5"/>
        <text x="100" y="68" font-size="7" fill="${t.accent}" font-family="JetBrains Mono, monospace">Motor Speed</text>
      </svg>`,
    },

    /* 16 — Project Save & Load */
    {
      target: '#btn-save-project',
      title: 'Project Save & Load',
      desc: 'Save your current session — all signal groups, display names, overlay configurations, and view range — as a .tracelab file. Load it later to restore the full state without re-configuring anything.',
      prefer: 'bottom',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="12" width="44" height="50" rx="5" stroke="${t.accent}" stroke-width="1.5" fill="${t.bg}"/>
        <path d="M30 12 L30 50 L74 50 L74 28 L56 12 Z" stroke="${t.accent}" stroke-width="1.5" fill="${t.bg}"/>
        <polyline points="56,12 56,28 74,28" stroke="${t.accent}" stroke-width="1" fill="${t.accentDim}"/>
        <rect x="38" y="38" width="28" height="18" rx="3" fill="${t.accentDim}" stroke="${t.accent}55" stroke-width="1"/>
        <text x="52" y="50" font-size="7" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">.trace</text>
        <text x="52" y="58" font-size="6" fill="${t.text3}" text-anchor="middle" font-family="JetBrains Mono, monospace">lab</text>
        <line x1="84" y1="37" x2="104" y2="37" stroke="${t.text3}" stroke-width="1.5" stroke-dasharray="3 2"/>
        <rect x="108" y="12" width="144" height="56" rx="5" stroke="${t.border}" stroke-width="1.5" fill="${t.bg}"/>
        <text x="116" y="24" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">groups: 2</text>
        <text x="116" y="34" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">signals: 5</text>
        <text x="116" y="44" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">overlays: 3</text>
        <text x="116" y="54" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">viewRange: saved</text>
        <text x="116" y="64" font-size="7" fill="${t.green}" font-family="JetBrains Mono, monospace">✓ all state restored</text>
      </svg>`,
    },

    /* 17 — Ready! */
    {
      target: null,
      title: "You're Ready!",
      desc: "That's everything TraceLab has to offer. Load a CSV and start exploring your trend data. If you need a refresher, click the ? button in the top bar to reopen this tutorial anytime.",
      prefer: null,
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="140" cy="40" r="28" stroke="${t.green}" stroke-width="2" fill="${t.green}18"/>
        <polyline points="124,40 136,52 158,28" stroke="${t.green}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="140" cy="40" r="36" stroke="${t.green}" stroke-width="1" opacity="0.3" stroke-dasharray="4 4"/>
        <text x="140" y="76" font-size="8" fill="${t.text3}" text-anchor="middle" font-family="JetBrains Mono, monospace">TRACELAB</text>
      </svg>`,
    },
  ];
}
