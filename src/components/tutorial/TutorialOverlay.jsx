import { useState, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { FONT_DISPLAY, FONT_MONO } from "../../constants/theme";
import { buildSteps } from "./steps";
import "./tutorial.css";

const PAD = 8;
const CARD_W = 340;
const GAP = 16;

function getTargetRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return r;
}

function positionBackdrop(el, rect) {
  if (!el) return;
  if (!rect) {
    el.classList.remove("has-target");
    el.classList.add("no-target");
    el.style.top = el.style.left = el.style.width = el.style.height = "";
    return;
  }
  el.classList.remove("no-target");
  el.classList.add("has-target");
  el.style.top = `${rect.top - PAD}px`;
  el.style.left = `${rect.left - PAD}px`;
  el.style.width = `${rect.width + PAD * 2}px`;
  el.style.height = `${rect.height + PAD * 2}px`;
}

function positionPulse(el, rect, accentColor) {
  if (!el) return;
  if (!rect) { el.style.display = "none"; return; }
  el.style.display = "";
  el.style.top = `${rect.top - PAD}px`;
  el.style.left = `${rect.left - PAD}px`;
  el.style.width = `${rect.width + PAD * 2}px`;
  el.style.height = `${rect.height + PAD * 2}px`;
  el.style.setProperty("--pulse-color", accentColor);
}

function positionCard(cardEl, arrowEl, step, rect) {
  if (!cardEl || !arrowEl) return;
  const isCentered = !rect;
  cardEl.classList.toggle("centered", isCentered);

  if (isCentered) {
    cardEl.style.top = cardEl.style.left = "";
    arrowEl.style.display = "none";
    return;
  }

  arrowEl.style.display = "";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardH = cardEl.offsetHeight || 280;

  let pos = step.prefer || "bottom";
  if (pos === "bottom" && rect.bottom + GAP + cardH > vh) pos = "top";
  if (pos === "top"    && rect.top - GAP - cardH < 0)    pos = "bottom";
  if (pos === "right"  && rect.right + GAP + CARD_W > vw) pos = "left";
  if (pos === "left"   && rect.left - GAP - CARD_W < 0)  pos = "right";

  let top, left;
  arrowEl.className = "tutorial-card-arrow";
  const targetCX = rect.left + rect.width / 2;
  const targetCY = rect.top + rect.height / 2;

  switch (pos) {
    case "bottom":
      top = rect.bottom + GAP;
      left = targetCX - CARD_W / 2;
      arrowEl.classList.add("arrow-top");
      break;
    case "top":
      top = rect.top - GAP - cardH;
      left = targetCX - CARD_W / 2;
      arrowEl.classList.add("arrow-bottom");
      break;
    case "right":
      top = targetCY - cardH / 2;
      left = rect.right + GAP;
      arrowEl.classList.add("arrow-left");
      break;
    case "left":
      top = targetCY - cardH / 2;
      left = rect.left - GAP - CARD_W;
      arrowEl.classList.add("arrow-right");
      break;
    default:
      top = 0; left = 0;
  }

  left = Math.max(12, Math.min(left, vw - CARD_W - 12));
  top  = Math.max(12, Math.min(top,  vh - cardH - 12));

  arrowEl.style.top = arrowEl.style.left = arrowEl.style.right = arrowEl.style.bottom = "";
  if (pos === "bottom" || pos === "top") {
    arrowEl.style.left = `${Math.max(16, Math.min(targetCX - left - 6, CARD_W - 28))}px`;
  } else {
    arrowEl.style.top = `${Math.max(16, Math.min(targetCY - top - 6, cardH - 28))}px`;
  }

  cardEl.style.top  = `${top}px`;
  cardEl.style.left = `${left}px`;
}

export default function TutorialOverlay({ open, onClose, t, theme }) {
  const [step, setStep] = useState(0);
  const [confirming, setConfirming] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const steps = useMemo(() => buildSteps(t), [theme]);

  const backdropRef  = useRef(null);
  const backdropRef2 = useRef(null);
  const pulseRef     = useRef(null);
  const cardRef      = useRef(null);
  const arrowRef     = useRef(null);
  const exitBtnRef  = useRef(null);

  // Reset step to 0 every time the overlay opens
  useEffect(() => {
    if (open) { setStep(0); setConfirming(false); }
  }, [open]);

  // Move focus to Exit button when confirmation dialog appears
  useEffect(() => {
    if (confirming && exitBtnRef.current) exitBtnRef.current.focus();
  }, [confirming]);

  // Keyboard navigation
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

  // Positioning — runs after each render when open or step changes
  useEffect(() => {
    if (!open) return;
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
    position();
    const raf = requestAnimationFrame(position);
    window.addEventListener("resize", position);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", position);
    };
  }, [open, step, steps, t.accent, confirming]);

  if (!open) return null;

  const currentStep = steps[step];
  const isFirst = step === 0;
  const isLast  = step === steps.length - 1;

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

  const arrowStyle = {
    position: "absolute",
    width: 12,
    height: 12,
    background: t.panel,
    border: `1px solid ${t.border}`,
    transform: "rotate(45deg)",
    zIndex: -1,
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        pointerEvents: currentStep.allowInteract ? "none" : "auto",
      }}
      onClick={(e) => {
        if (!currentStep.allowInteract && e.target === e.currentTarget) setConfirming(true);
      }}
    >
      {/* Primary spotlight */}
      <div className="tutorial-backdrop" ref={backdropRef} />
      {/* Secondary spotlight (multi-target steps) */}
      <div className="tutorial-backdrop secondary-highlight" ref={backdropRef2} style={{ display: "none" }} />

      {/* Pulse ring around target */}
      <div className="tutorial-pulse" ref={pulseRef} style={{ display: "none" }} />

      {/* Coach card */}
      <div className="tutorial-card visible" ref={cardRef} style={cardStyle}>
        {/* ✕ corner button */}
        <button
          onClick={() => setConfirming(true)}
          style={{
            position: "absolute", top: -10, right: -10,
            width: 22, height: 22, borderRadius: "50%",
            background: t.panel, border: `1px solid ${t.border}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            display: confirming ? "none" : "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0,
            fontSize: 11, color: t.text3,
            pointerEvents: "auto",
          }}
          aria-label="Exit tutorial"
        >
          ✕
        </button>

        {/* Arrow */}
        <div className="tutorial-card-arrow" ref={arrowRef} style={arrowStyle} />

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
                ref={exitBtnRef}
                type="button"
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
                type="button"
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
                type="button"
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
                type="button"
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
      </div>
    </div>,
    document.body
  );
}
