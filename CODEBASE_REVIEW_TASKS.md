# Codebase Review: Proposed Tasks

## 1) Typo cleanup task
**Task:** Rename `handleDrop2` to `handleDrop` in `GroupPanel`.

**Why:** The `2` suffix appears to be an accidental leftover naming typo and hurts readability/maintainability.

**Acceptance criteria:**
- Function is renamed to `handleDrop`.
- JSX `onDrop` handler is updated accordingly.
- No behavior changes.

---

## 2) Bug fix task
**Task:** Fix `ExportPanel` selection state so it resets when a new dataset is loaded.

**Why:** `exportPens` is initialized from `data.signals` only once (`useState` initializer) and is not synchronized when the `data` prop changes. After loading a different CSV/project, selected export pens can be stale or mismatched with current signals.

**Acceptance criteria:**
- `exportPens` updates whenever `data` changes.
- Existing UX for toggling individual pens, ALL/NONE, and export preview still works.
- Add regression coverage (see test task).

---

## 3) Documentation discrepancy task
**Task:** Resolve README guidance that references `.env.example`, which is not present in the repository.

**Why:** README tells users to create `.env` from `.env.example`, but there is no `.env.example` file currently. This causes setup confusion.

**Acceptance criteria (pick one):**
- Add a `.env.example` containing `VITE_DEFAULT_CSV_URL=` and keep README as-is, **or**
- Update README to describe creating `.env` manually without referencing `.env.example`.

---

## 4) Test improvement task
**Task:** Add a test runner + focused unit tests for CSV parsing and export-state behavior.

**Why:** There is currently no `test` script in `package.json`, which makes regressions easy to miss. The parser and export selection behavior are core logic and high-value test targets.

**Minimum scope:**
- Add a `test` script (e.g., Vitest).
- Add parser tests for:
  - parsing header/meta fields,
  - timestamp extraction,
  - digital signal detection.
- Add a component/state test that verifies `exportPens` resets when `data` prop changes.

