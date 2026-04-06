# TraceLab

This package turns the original single-file TraceLab JSX into a local Vite + React app that is easier to run, edit, and maintain.

## What changed

- Split the original monolith into reusable modules:
  - `src/constants/` for themes, group colors, and font constants
  - `src/utils/` for CSV parsing, date formatting, stats, downloads, and font injection
  - `src/components/` for charting, export UI, signal cards, group panels, and controls
  - `src/App.jsx` as the top-level orchestration layer
- Removed the ChatGPT-only hardcoded CSV path (`/mnt/user-data/uploads/Registration.CSV`) so the app runs cleanly on a normal local machine.
- Added optional support for a default CSV via `VITE_DEFAULT_CSV_URL` in `.env`.
- Added Windows and macOS/Linux launch/build scripts.
- Preserved the original source in `reference/original/` for comparison.

## Project layout

```text
TraceLab/
├─ src/
│  ├─ components/
│  ├─ constants/
│  ├─ utils/
│  ├─ App.jsx
│  ├─ main.jsx
│  └─ styles.css
├─ scripts/
│  ├─ dev.sh / dev.bat
│  └─ build.sh / build.bat
├─ reference/original/
├─ index.html
├─ package.json
└─ vite.config.js
```

## Run locally

### macOS / Linux

```bash
./launch-dev.sh
```

### Windows

```bat
launch-dev.bat
```

### Manual npm flow

```bash
npm install
npm run dev -- --host
```

Then open the URL Vite prints, usually `http://localhost:5173`.

## Production build

### macOS / Linux

```bash
./build-local.sh
```

### Windows

```bat
build-local.bat
```

Or manually:

```bash
npm install
npm run build
npm run preview -- --host
```

## Optional default CSV

If you want the app to auto-load a CSV on startup, create a `.env` file from `.env.example` and set:

```bash
VITE_DEFAULT_CSV_URL=/your-file.csv
```

Place that CSV in `public/` or point it at another URL that your local dev server can reach.

## Notes

- This app still expects Studio 5000 trend CSVs and `.tracelab` project files.
- The UI is still mostly inline-styled so behavior stays close to the source version.
- I did not rewrite the chart logic; I moved it into modules with minimal functional changes.
