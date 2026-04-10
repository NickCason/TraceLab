# Tutorial UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement signal inline rename, tutorial close-button repositioning, close confirmation, per-step `allowInteract`, multi-target spotlight, and all step content updates for the TraceLab tutorial overlay.

**Architecture:** Signal rename threads a new `onRenameDisplay(idx, name)` callback from App.jsx → GroupPanel.jsx → SignalCard.jsx where double-clicking the label enters an inline `<input>`. Tutorial changes are isolated to `TutorialOverlay.jsx` (state additions + JSX restructure) and `steps.js` (data-only edits). The secondary spotlight uses a second imperative `backdropRef2` DOM element to avoid React state churn.

**Tech Stack:** React 18, inline styles, Node.js built-in `--test` (utils only — no React component testing framework; verify React changes in browser)

---

## File Map

| File | Change |
|------|--------|
| `src/App.jsx` | Add `handleRenameDisplay` handler; pass as `onRenameDisplay` prop to `<GroupPanel>` |
| `src/components/GroupPanel.jsx` | Accept + forward `onRenameDisplay` to `<SignalCard>` |
| `src/components/SignalCard.jsx` | Add `editingLabel` state + inline `<input>` on double-click |
| `src/components/tutorial/TutorialOverlay.jsx` | Remove Skip/Close nav button; add ✕ corner button; add `confirming` state + confirmation UI; add `allowInteract` pointer-event toggle; add `backdropRef2` for secondary spotlight |
| `src/components/tutorial/tutorial.css` | Add `.tutorial-backdrop.secondary-highlight` rule |
| `src/components/tutorial/steps.js` | Add `allowInteract` to steps 5/6/7; `targets` array to step 6; updated desc for steps 1/4/5/9/10/15; new SVG for step 11 |

---

## Task 1: Signal Rename — Add handler in App.jsx

**Files:**
- Modify: `src/App.jsx` (near line 397 where `getDisplayName` is defined; GroupPanel usage at line 816)

- [ ] **Step 1: Add `handleRenameDisplay` near `getDisplayName`**

  Find the `getDisplayName` definition at line 397:
  ```js
  const getDisplayName = (i) => metadata[i]?.displayName || data?.tagNames[i] || `Signal ${i}`;
  ```

  Insert immediately after it:
  ```js
  const handleRenameDisplay = (idx, newName) => {
    setMetadata(prev => {
      const entry = { ...(prev[idx] || {}) };
      if (newName) {
        entry.displayName = newName;
      } else {
        delete entry.displayName;
      }
      return { ...prev, [idx]: entry };
    });
  };
  ```

- [ ] **Step 2: Pass `onRenameDisplay` to `<GroupPanel>`**

  In the `<GroupPanel>` usage around line 881, add the prop after `getDisplayName`:
  ```jsx
  getDisplayName={getDisplayName}
  onRenameDisplay={handleRenameDisplay}
  ```

- [ ] **Step 3: Verify in browser**

  Start dev server (`npm run dev`). Open TraceLab with a CSV loaded. Open DevTools console. In console run: `window._testRename = true`. No errors expected — the prop is passed but not yet wired up. Continue to next task.

- [ ] **Step 4: Commit**

  ```bash
  git add src/App.jsx
  git commit -m "feat: add handleRenameDisplay callback in App"
  ```

---

## Task 2: Signal Rename — Thread through GroupPanel.jsx

**Files:**
- Modify: `src/components/GroupPanel.jsx` (line 8 props destructure; line 151 SignalCard usage)

- [ ] **Step 1: Accept prop in GroupPanel**

  On line 8, the destructured props list ends with `getDisplayName`. Add `onRenameDisplay` to it:
  ```js
  export default function GroupPanel({ groupIdx, label, color, signals, sigColors, visible, groups, cursorValues, cursor2Values, deltaMode, metadata, data, onDrop, onToggleVisible, onToggleGroup, onSetGroupName, onStyleChange, signalStyles, referenceOverlays = [], derivedConfigs, onEditDerived, onDeleteDerived, onAddOverlay, onUpdateOverlay, onDeleteOverlay, theme, getDisplayName, onRenameDisplay }) {
  ```

- [ ] **Step 2: Forward prop to SignalCard**

  In the `<SignalCard>` block (around line 151), add after `onStyleChange`:
  ```jsx
  onStyleChange={onStyleChange}
  onRenameDisplay={onRenameDisplay}
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/GroupPanel.jsx
  git commit -m "feat: thread onRenameDisplay through GroupPanel to SignalCard"
  ```

---

## Task 3: Signal Rename — Inline edit in SignalCard.jsx

**Files:**
- Modify: `src/components/SignalCard.jsx`

- [ ] **Step 1: Add `editingLabel` state and `onRenameDisplay` prop**

  Change the function signature from:
  ```js
  export default function SignalCard({ index, signal, color, dash, strokeMode = "solid", thickness = 1.5, opacity = 0.92, displayName, tagName, unit, visible: vis, cursorValue, cursorValueIsInterpolated, cursor2Value, deltaMode, isDigital, isDerived, derivedType, seamOffset = 0, seamOffsetPct, onEditDerived, onDeleteDerived, onToggleVisible, onStyleChange, theme }) {
  ```
  To:
  ```js
  export default function SignalCard({ index, signal, color, dash, strokeMode = "solid", thickness = 1.5, opacity = 0.92, displayName, tagName, unit, visible: vis, cursorValue, cursorValueIsInterpolated, cursor2Value, deltaMode, isDigital, isDerived, derivedType, seamOffset = 0, seamOffsetPct, onEditDerived, onDeleteDerived, onToggleVisible, onStyleChange, onRenameDisplay, theme }) {
  ```

  After the existing `const [showStylePicker, setShowStylePicker] = useState(false);` line, add:
  ```js
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  ```

- [ ] **Step 2: Replace the display name area with conditional inline input**

  Find the block starting at line 102 (the label wrapper div and MarqueeText for displayName):
  ```jsx
  <div onClick={(e) => { e.stopPropagation(); onToggleVisible(index); }} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
    <MarqueeText style={{ fontSize: 13, fontWeight: 600, color: vis ? t.text1 : t.text3, display: "flex", alignItems: "center", gap: 3 }}>
      {displayName}
      {unit && <span style={{ fontSize: 13, color: t.text3, fontWeight: 400, fontFamily: FONT_MONO, flexShrink: 0 }}>[{unit}]</span>}
      {isDigital && <span style={{ fontSize: 12, color: t.accent, background: t.accentDim, padding: "1px 4px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, lineHeight: "10px", flexShrink: 0, fontFamily: FONT_DISPLAY }}>DIG</span>}
      {isDerived && <span style={{ fontSize: 10, color: t.warn, background: t.warn + "18", padding: "1px 4px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, lineHeight: "10px", flexShrink: 0, fontFamily: FONT_MONO }}>{(derivedType || "derived").toUpperCase()}</span>}
    </MarqueeText>
    {hasCustomName && (
      <MarqueeText style={{ fontSize: 12, color: t.text4, fontFamily: FONT_MONO, marginTop: 1 }}>
        {tagName}
      </MarqueeText>
    )}
    {cursorValue !== undefined && cursorValue !== null && vis && (
      <div style={{ fontSize: 13, color: color, marginTop: 1, fontFamily: FONT_MONO, opacity: cursorValueIsInterpolated ? 0.6 : 1 }}>
        {cursorValue?.toFixed(3) ?? "—"}{cursorValueIsInterpolated ? " ~" : ""}{unit ? ` ${unit}` : ""}
      </div>
    )}
  </div>
  ```

  Replace with:
  ```jsx
  <div onClick={(e) => { e.stopPropagation(); if (!editingLabel) onToggleVisible(index); }} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
    {editingLabel ? (
      <input
        autoFocus
        value={labelInput}
        onChange={e => setLabelInput(e.target.value)}
        onBlur={() => { onRenameDisplay(index, labelInput.trim() || tagName); setEditingLabel(false); }}
        onKeyDown={e => {
          if (e.key === "Enter") { onRenameDisplay(index, labelInput.trim() || tagName); setEditingLabel(false); }
          if (e.key === "Escape") { setEditingLabel(false); }
          e.stopPropagation();
        }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", fontSize: 13, fontWeight: 600,
          background: t.inputBg, border: `1px solid ${t.accent}`,
          borderRadius: 4, padding: "0 4px", color: t.text1,
          fontFamily: FONT_DISPLAY, outline: "none", minWidth: 0,
          boxSizing: "border-box",
        }}
      />
    ) : (
      <MarqueeText
        onDoubleClick={e => { e.stopPropagation(); setLabelInput(displayName); setEditingLabel(true); }}
        style={{ fontSize: 13, fontWeight: 600, color: vis ? t.text1 : t.text3, display: "flex", alignItems: "center", gap: 3 }}
      >
        {displayName}
        {unit && <span style={{ fontSize: 13, color: t.text3, fontWeight: 400, fontFamily: FONT_MONO, flexShrink: 0 }}>[{unit}]</span>}
        {isDigital && <span style={{ fontSize: 12, color: t.accent, background: t.accentDim, padding: "1px 4px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, lineHeight: "10px", flexShrink: 0, fontFamily: FONT_DISPLAY }}>DIG</span>}
        {isDerived && <span style={{ fontSize: 10, color: t.warn, background: t.warn + "18", padding: "1px 4px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, lineHeight: "10px", flexShrink: 0, fontFamily: FONT_MONO }}>{(derivedType || "derived").toUpperCase()}</span>}
      </MarqueeText>
    )}
    {!editingLabel && hasCustomName && (
      <MarqueeText style={{ fontSize: 12, color: t.text4, fontFamily: FONT_MONO, marginTop: 1 }}>
        {tagName}
      </MarqueeText>
    )}
    {!editingLabel && cursorValue !== undefined && cursorValue !== null && vis && (
      <div style={{ fontSize: 13, color: color, marginTop: 1, fontFamily: FONT_MONO, opacity: cursorValueIsInterpolated ? 0.6 : 1 }}>
        {cursorValue?.toFixed(3) ?? "—"}{cursorValueIsInterpolated ? " ~" : ""}{unit ? ` ${unit}` : ""}
      </div>
    )}
  </div>
  ```

  > **Note:** `MarqueeText` must accept and forward `onDoubleClick`. If it doesn't, wrap the display name span in a `<span onDoubleClick={...}>` instead of putting it on `MarqueeText`. Check `src/components/MarqueeText.jsx` — if it's a plain wrapper div/span, the prop will pass through via spread; if it intercepts events, wrap the text in a `<span>` instead.

- [ ] **Step 3: Verify in browser**

  With dev server running and a CSV loaded: double-click a signal label — should enter an `<input>` with the current name pre-filled. Type a new name, press Enter — the label updates. Double-click again, press Escape — name unchanged. Double-click, clear the field, press Enter — reverts to original tag name. Open the Meta tab — the display name field should reflect the renamed value and vice versa.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/SignalCard.jsx
  git commit -m "feat: inline rename signal display label on double-click"
  ```

---

## Task 4: Tutorial — Close Button Repositioning

**Files:**
- Modify: `src/components/tutorial/TutorialOverlay.jsx`

The goal: remove the "Skip/Close" text button from the nav bar; add a circular ✕ button at `position: absolute; top: -10px; right: -10px` on the card.

- [ ] **Step 1: Remove the Skip/Close button from the nav bar**

  Find and delete these lines (the Skip/Close button, lines 307–319):
  ```jsx
          {/* Skip / Close */}
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: t.text3, textDecoration: "underline",
              textUnderlineOffset: 2, fontSize: 11,
              padding: "4px 6px", cursor: "pointer", fontFamily: FONT_DISPLAY,
            }}
          >
            {isLast ? "Close" : "Skip"}
          </button>
  ```

- [ ] **Step 2: Add the ✕ corner button inside the card div**

  In the card `<div className="tutorial-card visible" ...>`, immediately before the `{/* Arrow */}` comment, insert:
  ```jsx
        {/* ✕ close button */}
        <button
          onClick={() => setConfirming(true)}
          style={{
            position: "absolute", top: -10, right: -10,
            width: 22, height: 22, borderRadius: "50%",
            background: t.panel, border: `1px solid ${t.border}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0,
            fontSize: 11, color: t.text3,
            pointerEvents: "auto",
          }}
          aria-label="Exit tutorial"
        >
          ✕
        </button>
  ```

  > Note: `setConfirming` doesn't exist yet — it will be added in Task 5. For now, replace `setConfirming(true)` with `onClose()` as a placeholder so the button works. You'll fix this in Task 5.

  So for Task 4, the button's `onClick` is:
  ```jsx
  onClick={onClose}
  ```

- [ ] **Step 3: Verify in browser**

  The tutorial should open without the "Skip/Close" text link. The ✕ button should appear overlapping the top-right corner of the card. Clicking it should close the tutorial. The card should not have `overflow: hidden` (it defaults to `visible`, so the ✕ button overflows correctly).

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/tutorial/TutorialOverlay.jsx
  git commit -m "feat: replace Skip/Close nav button with corner ✕ button"
  ```

---

## Task 5: Tutorial — Close Confirmation UI

**Files:**
- Modify: `src/components/tutorial/TutorialOverlay.jsx`

- [ ] **Step 1: Add `confirming` state**

  After the `const [step, setStep] = useState(0);` line, add:
  ```js
  const [confirming, setConfirming] = useState(false);
  ```

- [ ] **Step 2: Reset `confirming` when overlay opens**

  Find:
  ```js
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);
  ```

  Replace with:
  ```js
  useEffect(() => {
    if (open) { setStep(0); setConfirming(false); }
  }, [open]);
  ```

- [ ] **Step 3: Update keyboard handler for Escape + navigation**

  Find the keyboard navigation `useEffect`. Replace it entirely with:
  ```js
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation(); e.preventDefault();
        if (confirming) { setConfirming(false); return; }
        onClose();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.stopPropagation(); e.preventDefault();
        setConfirming(false);
        setStep(s => {
          if (s < steps.length - 1) return s + 1;
          onClose();
          return s;
        });
        return;
      }
      if (e.key === "ArrowLeft") {
        e.stopPropagation(); e.preventDefault();
        setConfirming(false);
        setStep(s => s > 0 ? s - 1 : s);
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, steps.length, onClose, confirming]);
  ```

- [ ] **Step 4: Update Back/Next button onClick to reset confirming**

  Find the Back button:
  ```jsx
  <button
    disabled={isFirst}
    onClick={() => setStep(s => s - 1)}
    ...
  >
    ← Back
  </button>
  ```
  Change `onClick` to:
  ```jsx
  onClick={() => { setConfirming(false); setStep(s => s - 1); }}
  ```

  Find the Next/Finish button:
  ```jsx
  <button
    onClick={() => isLast ? onClose() : setStep(s => s + 1)}
    ...
  >
  ```
  Change `onClick` to:
  ```jsx
  onClick={() => { setConfirming(false); isLast ? onClose() : setStep(s => s + 1); }}
  ```

- [ ] **Step 5: Update the ✕ corner button to use `setConfirming`**

  Find the ✕ button added in Task 4 (with `onClick={onClose}` placeholder). Change to:
  ```jsx
  onClick={() => setConfirming(true)}
  ```

  Also add `display: confirming ? "none" : "flex"` to the ✕ button style (hidden while confirming):
  ```jsx
  style={{
    position: "absolute", top: -10, right: -10,
    width: 22, height: 22, borderRadius: "50%",
    background: t.panel, border: `1px solid ${t.border}`,
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
    display: confirming ? "none" : "flex",
    alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0,
    fontSize: 11, color: t.text3,
    pointerEvents: "auto",
  }}
  ```

- [ ] **Step 6: Update backdrop click to call `setConfirming` instead of `onClose`**

  Find the outer container div's `onClick`:
  ```jsx
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
  ```
  Replace with:
  ```jsx
  onClick={(e) => {
    if (e.target === e.currentTarget) setConfirming(true);
  }}
  ```

  > Note: the `allowInteract` condition that suppresses backdrop clicks entirely is added in Task 6. For now, all backdrop clicks trigger confirmation.

- [ ] **Step 7: Add confirmation body — conditional card content**

  The card currently renders: step counter → title → diagram → description → nav bar.

  Wrap the card's interior in a conditional. Find the card's inner content starting with the step counter `<div>` and ending with the closing `</div>` of the nav bar. Replace all of that interior with:

  ```jsx
        {confirming ? (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <p style={{
              fontSize: 14, fontWeight: 600, color: t.text1,
              margin: "0 0 8px", fontFamily: FONT_DISPLAY,
            }}>
              Exit the tutorial?
            </p>
            <p style={{
              fontSize: 12, color: t.text3, margin: "0 0 20px",
              lineHeight: 1.55, fontFamily: FONT_DISPLAY,
            }}>
              You can restart it anytime with the ? button.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                onClick={() => { onClose(); setConfirming(false); }}
                style={{
                  padding: "5px 18px", borderRadius: 5, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", background: t.red, border: `1px solid ${t.red}`,
                  color: "#fff", fontFamily: FONT_DISPLAY,
                }}
              >
                Exit
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  padding: "5px 18px", borderRadius: 5, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", background: t.surface, border: `1px solid ${t.border}`,
                  color: t.text2, fontFamily: FONT_DISPLAY,
                }}
              >
                Keep going
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step counter */}
            <div style={{
              fontSize: 10, color: t.text3, fontFamily: FONT_MONO,
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
            }}>
              Step {step + 1} of {steps.length}
            </div>

            {/* Title */}
            <h3 style={{
              fontFamily: FONT_MONO, fontSize: 14, fontWeight: 600,
              color: t.accent, margin: "0 0 10px", letterSpacing: 0.3,
            }}>
              {currentStep.title}
            </h3>

            {/* Diagram */}
            {currentStep.svg && (
              <div
                className="tutorial-diagram"
                style={{
                  display: "flex", justifyContent: "center",
                  marginBottom: 12, padding: "10px 0",
                  background: t.bg, borderRadius: 6,
                  border: `1px solid ${t.border}`,
                }}
                dangerouslySetInnerHTML={{ __html: currentStep.svg }}
              />
            )}

            {/* Description */}
            <p style={{
              fontSize: 12.5, lineHeight: 1.65,
              color: t.text2, margin: "0 0 14px",
              fontFamily: FONT_DISPLAY,
            }}>
              {currentStep.desc}
            </p>

            {/* Navigation bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              borderTop: `1px solid ${t.border}`, paddingTop: 12,
            }}>
              {/* Progress dots */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginRight: "auto" }}>
                {steps.map((_, i) => (
                  <span key={i} style={{
                    display: "inline-block",
                    width: 6, height: 6, borderRadius: "50%",
                    background: i === step ? t.accent : i < step ? t.green : t.border,
                    transform: i === step ? "scale(1.3)" : "none",
                    transition: "background 0.2s, transform 0.2s",
                    flexShrink: 0,
                  }} />
                ))}
              </div>

              {/* Back */}
              <button
                disabled={isFirst}
                onClick={() => { setConfirming(false); setStep(s => s - 1); }}
                style={{
                  padding: "5px 14px", borderRadius: 5, fontSize: 12, fontWeight: 500,
                  cursor: isFirst ? "default" : "pointer",
                  background: t.surface, border: `1px solid ${t.border}`,
                  color: t.text2, opacity: isFirst ? 0.35 : 1, fontFamily: FONT_DISPLAY,
                }}
              >
                ← Back
              </button>

              {/* Next / Finish */}
              <button
                onClick={() => { setConfirming(false); isLast ? onClose() : setStep(s => s + 1); }}
                style={{
                  padding: "5px 14px", borderRadius: 5, fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  background: t.accent, border: `1px solid ${t.accent}`,
                  color: t.chart,
                  fontFamily: FONT_DISPLAY,
                }}
              >
                {isLast ? "Finish" : "Next →"}
              </button>
            </div>
          </>
        )}
  ```

- [ ] **Step 8: Verify in browser**

  - Open tutorial → click ✕ → card should show "Exit the tutorial?" confirmation. ✕ button disappears.
  - Click "Keep going" → normal card returns.
  - Confirm view → press Escape → returns to normal (no close).
  - Confirm view → click "Exit" → tutorial closes.
  - Confirm view → press ArrowRight → normal card, advances step.
  - Click backdrop → confirmation appears.

- [ ] **Step 9: Commit**

  ```bash
  git add src/components/tutorial/TutorialOverlay.jsx
  git commit -m "feat: add close confirmation UI to tutorial overlay"
  ```

---

## Task 6: Tutorial — allowInteract Per-Step Flag

**Files:**
- Modify: `src/components/tutorial/TutorialOverlay.jsx`
- Modify: `src/components/tutorial/steps.js`

- [ ] **Step 1: Add pointer-event toggling to TutorialOverlay**

  Find the outer container div:
  ```jsx
  <div
    style={{ position: "fixed", inset: 0, zIndex: 9000, pointerEvents: "auto" }}
    onClick={(e) => {
      if (e.target === e.currentTarget) setConfirming(true);
    }}
  >
  ```

  Replace with:
  ```jsx
  <div
    style={{
      position: "fixed", inset: 0, zIndex: 9000,
      pointerEvents: currentStep.allowInteract ? "none" : "auto",
    }}
    onClick={(e) => {
      if (!currentStep.allowInteract && e.target === e.currentTarget) setConfirming(true);
    }}
  >
  ```

  Find the card `<div className="tutorial-card visible" ...>` and add `pointerEvents: "auto"` to its `cardStyle`:
  ```js
  const cardStyle = {
    position: "absolute",
    width: CARD_W,
    maxWidth: "calc(100vw - 32px)",
    background: t.panel,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    boxShadow: t.cardShadow,
    padding: "18px 20px 14px",
    zIndex: 9001,
    fontFamily: FONT_DISPLAY,
    pointerEvents: "auto",
  };
  ```

- [ ] **Step 2: Add `allowInteract: true` to steps 5, 6, 7 in steps.js**

  Step 5 — find `/* 5 — Chart Cursor & Navigation */` block. After `prefer: 'top',` add:
  ```js
  allowInteract: true,
  ```

  Step 6 — find `/* 6 — Edge Values & Peaks */` block. After `prefer: 'bottom',` add:
  ```js
  allowInteract: true,
  ```

  Step 7 — find `/* 7 — Delta Mode */` block. After `prefer: 'bottom',` add:
  ```js
  allowInteract: true,
  ```

- [ ] **Step 3: Verify in browser**

  Navigate tutorial to step 5 (Chart Cursor & Navigation). Click on the chart — the click should go through to the chart, not trigger confirmation. The ✕ button and Back/Next buttons remain clickable. Navigate away from step 5 — backdrop clicks should trigger confirmation again.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/tutorial/TutorialOverlay.jsx src/components/tutorial/steps.js
  git commit -m "feat: add allowInteract per-step flag to tutorial overlay"
  ```

---

## Task 7: Tutorial — Multi-Target Spotlight

**Files:**
- Modify: `src/components/tutorial/TutorialOverlay.jsx`
- Modify: `src/components/tutorial/tutorial.css`
- Modify: `src/components/tutorial/steps.js`

- [ ] **Step 1: Add `backdropRef2` for secondary spotlight**

  In TutorialOverlay, find the refs block:
  ```js
  const backdropRef = useRef(null);
  const pulseRef    = useRef(null);
  const cardRef     = useRef(null);
  const arrowRef    = useRef(null);
  ```

  Add `backdropRef2`:
  ```js
  const backdropRef  = useRef(null);
  const backdropRef2 = useRef(null);
  const pulseRef     = useRef(null);
  const cardRef      = useRef(null);
  const arrowRef     = useRef(null);
  ```

- [ ] **Step 2: Update the positioning effect to handle `targets` array**

  Find the `position` function inside the positioning `useEffect`:
  ```js
  const position = () => {
    const s = steps[step];
    const rect = getTargetRect(s?.target);
    positionBackdrop(backdropRef.current, rect);
    positionPulse(pulseRef.current, rect, t.accent);
    positionCard(cardRef.current, arrowRef.current, s, rect);
  };
  ```

  Replace with:
  ```js
  const position = () => {
    const s = steps[step];
    const selectors = s.targets ? s.targets : (s.target ? [s.target] : []);
    const primaryRect   = selectors[0] ? getTargetRect(selectors[0]) : null;
    const secondaryRect = selectors[1] ? getTargetRect(selectors[1]) : null;

    positionBackdrop(backdropRef.current, primaryRect);
    positionPulse(pulseRef.current, primaryRect, t.accent);
    positionCard(cardRef.current, arrowRef.current, s, primaryRect);

    if (backdropRef2.current) {
      if (secondaryRect) {
        backdropRef2.current.style.display = "";
        backdropRef2.current.style.top    = `${secondaryRect.top  - PAD}px`;
        backdropRef2.current.style.left   = `${secondaryRect.left - PAD}px`;
        backdropRef2.current.style.width  = `${secondaryRect.width  + PAD * 2}px`;
        backdropRef2.current.style.height = `${secondaryRect.height + PAD * 2}px`;
      } else {
        backdropRef2.current.style.display = "none";
      }
    }
  };
  ```

- [ ] **Step 3: Render the secondary backdrop element in JSX**

  Find in the JSX:
  ```jsx
  {/* Spotlight backdrop */}
  <div className="tutorial-backdrop" ref={backdropRef} />
  ```

  Replace with:
  ```jsx
  {/* Primary spotlight */}
  <div className="tutorial-backdrop" ref={backdropRef} />
  {/* Secondary spotlight (multi-target steps) */}
  <div className="tutorial-backdrop secondary-highlight" ref={backdropRef2} style={{ display: "none" }} />
  ```

- [ ] **Step 4: Add `.secondary-highlight` CSS rule**

  In `tutorial.css`, after the `.tutorial-backdrop.no-target { ... }` block, add:
  ```css
  .tutorial-backdrop.secondary-highlight {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
  }
  ```

- [ ] **Step 5: Update step 6 to use `targets` array**

  In `steps.js`, find `/* 6 — Edge Values & Peaks */`. Change:
  ```js
  target: '#btn-edges',
  ```
  To:
  ```js
  targets: ['#btn-edges', '#chart-pane-0'],
  ```

  (Step 6 already has `allowInteract: true` from Task 6.)

- [ ] **Step 6: Verify in browser**

  Navigate to step 6 (Edge Values & Peaks). The toolbar button `#btn-edges` should have the primary spotlight (dark backdrop with hole). The first chart pane `#chart-pane-0` should have a subtle bright border ring (secondary highlight). Both should animate/follow if the viewport resizes.

- [ ] **Step 7: Commit**

  ```bash
  git add src/components/tutorial/TutorialOverlay.jsx src/components/tutorial/tutorial.css src/components/tutorial/steps.js
  git commit -m "feat: add multi-target spotlight support for step 6"
  ```

---

## Task 8: Tutorial — Step Content Updates

**Files:**
- Modify: `src/components/tutorial/steps.js`

All changes are pure text/SVG replacements inside `steps.js`. Each sub-step below is one field replacement.

- [ ] **Step 1: Update Step 1 — Welcome desc**

  Find `/* 1 — Welcome */` block. Replace the `desc` value:
  ```js
  desc: 'TraceLab is a browser-based PLC trend CSV viewer. Load a Studio 5000 CSV, explore signals across grouped chart panes, and export annotated snapshots — all without installing anything.',
  ```
  With:
  ```js
  desc: 'TraceLab is a fast, browser-based viewer for PLC trend data. Load a Studio 5000 CSV, explore signals across grouped chart panes, use cursors, overlays, and derived values to inspect behavior, and export annotated snapshots — no install, just open and go.',
  ```

- [ ] **Step 2: Update Step 4 — Signals Style Editing desc**

  Find `/* 4 — Signals Style Editing */` block. Replace the `desc` value:
  ```js
  desc: "Click the gear/swatch on any signal card to open style options: change color, line dash pattern, stroke weight, or opacity. You can also rename a tag's display label here.",
  ```
  With:
  ```js
  desc: "Click the gear/swatch on any signal card to open style options: change color, line dash pattern, stroke weight, or opacity. Double-click a signal's label to rename it inline. Changes sync with the Meta tab.",
  ```

- [ ] **Step 3: Update Step 5 — Chart Cursor & Navigation desc**

  Find `/* 5 — Chart Cursor & Navigation */` block. Replace the `desc` value:
  ```js
  desc: 'Click the chart to place a cursor — signal values snap to the nearest sample and appear as pills above each line. Scroll to zoom in/out. Drag to pan. The time axis updates as you navigate.',
  ```
  With:
  ```js
  desc: 'Hover over the chart to move the cursor — signal values snap to the nearest sample and appear as pills above each line. Scroll to zoom in/out. Drag to pan. The time axis updates as you navigate.',
  ```

- [ ] **Step 4: Update Step 9 — Derived Signals Adding desc**

  Find `/* 9 — Derived Signals — Adding */` block. Replace the `desc` value:
  ```js
  desc: 'Click + Derived in the chart pane header to open the derived signal dialog. You can create a new signal as a math expression, rolling average, difference, ratio, or other combination of loaded signals.',
  ```
  With:
  ```js
  desc: 'Click + Derived in the chart pane header to open the derived signal dialog. You can create a new signal as a math expression, rolling average, difference, ratio, or other combination of loaded signals — and manage it as a new pen.',
  ```

- [ ] **Step 5: Update Step 10 — Derived Signals Dialog desc**

  Find `/* 10 — Derived Signals — The Dialog */` block. Replace the `desc` value:
  ```js
  desc: 'In the dialog, pick a type (Equation, Difference, Rolling Avg, etc.) then configure its parameters. Equation mode supports token syntax: s0, s1 ... for each loaded signal, plus standard math like avg(s0), abs(s0 - s1).',
  ```
  With:
  ```js
  desc: 'In the dialog, pick a type (Equation, Difference, Rolling Avg, etc.) then configure its parameters. Equation mode supports token syntax: s0, s1 ... for each loaded signal, plus standard math like avg(s0), abs(s0 - s1). Once added, edit or delete a derived signal from its signal card popover.',
  ```

- [ ] **Step 6: Replace Step 11 — References Adding SVG**

  Find `/* 11 — References — Adding */` block. Replace the entire `svg` template literal value (the long `<svg>...</svg>` string) with:
  ```js
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
  ```

- [ ] **Step 7: Update Step 15 — Meta Tab desc**

  Find `/* 15 — Meta Tab */` block. Replace the `desc` value:
  ```js
  desc: 'The Meta tab shows all metadata loaded from the CSV header — trend name, scan class, date/time, and per-signal units and descriptions. You can edit display names and units directly in this tab.',
  ```
  With:
  ```js
  desc: 'The Meta tab is where you customize how signals are presented — edit display names, set units, and add descriptions for any tag. Changes apply immediately across the chart panes.',
  ```

- [ ] **Step 8: Verify in browser**

  Open the tutorial and step through all steps. Verify:
  - Step 1 desc matches the new text
  - Step 4 desc mentions "Double-click a signal's label to rename it inline"
  - Step 5 desc says "Hover over the chart"
  - Step 9 desc includes "manage it as a new pen"
  - Step 10 desc includes "edit or delete a derived signal from its signal card popover"
  - Step 11 shows the SVG with 4 reference types (H Band, H Line, V Line, V Band)
  - Step 15 desc starts with "The Meta tab is where you customize"

- [ ] **Step 9: Run all tests to verify no regressions**

  ```bash
  cd C:/DevSpace/Work/tracelab && npm run test:unit
  ```
  Expected: all tests pass (these are utility tests, not component tests).

- [ ] **Step 10: Commit**

  ```bash
  git add src/components/tutorial/steps.js
  git commit -m "feat: update tutorial step content and step 11 SVG"
  ```

---

## Self-Review Against Spec

**Spec coverage:**

| Spec Section | Task |
|---|---|
| §1 Close button repositioning (position, size, colors, click behavior) | Task 4 |
| §2 Close confirmation UI (confirming state, Exit/Keep going, Escape, nav resets, last step) | Task 5 |
| §3 allowInteract flag (pointer-events, steps 5/6/7) | Task 6 |
| §4 Multi-target spotlight (targets array, secondary backdrop, card anchor on first) | Task 7 |
| §5 Signal rename (double-click, blur/Enter/Escape, empty reverts, Meta tab sync) | Tasks 1–3 |
| §6 Step content updates (steps 1, 4, 5, 9, 10, 11 SVG, 15) | Task 8 |

**Placeholder scan:** No TBDs or "implement later" items — all code blocks are complete.

**Type consistency:**
- `onRenameDisplay(idx, name)` — consistent across App.jsx, GroupPanel.jsx, SignalCard.jsx
- `backdropRef2` — consistent across ref declaration, positioning effect, and JSX
- `targets` array field — consistent between `steps.js` step 6 definition and `position()` function reading `s.targets`
- `confirming` state — consistent across all usages (useState, keyboard handler, card body, ✕ button display, backdrop click)

**Gaps found:** None.

---

## MarqueeText Note

Before executing Task 3 Step 2, check whether `MarqueeText` forwards arbitrary props to its root element. Read `src/components/MarqueeText.jsx`. If it uses a spread like `{...rest}` or explicitly handles `onDoubleClick`, you can put `onDoubleClick` directly on `<MarqueeText>`. If it does not spread props, wrap the display name text content in a `<span onDoubleClick={...} style={{ display: "contents" }}>` instead:

```jsx
<MarqueeText style={{ ... }}>
  <span
    onDoubleClick={e => { e.stopPropagation(); setLabelInput(displayName); setEditingLabel(true); }}
    style={{ display: "contents" }}
  >
    {displayName}
  </span>
  {unit && ...}
  ...
</MarqueeText>
```
