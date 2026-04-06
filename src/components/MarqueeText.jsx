import { useRef, useEffect, useState, useCallback } from "react";

// ── Shared stylesheet for all marquee keyframes ──
// One <style> element, rules added/removed by name.
let sharedSheet = null;
function getSheet() {
  if (sharedSheet) return sharedSheet;
  const el = document.createElement("style");
  el.setAttribute("data-marquee", "");
  document.head.appendChild(el);
  sharedSheet = el.sheet;
  return sharedSheet;
}

function insertRule(name, cssText) {
  const sheet = getSheet();
  // Remove existing rule with same name first
  removeRule(name);
  try { sheet.insertRule(cssText, sheet.cssRules.length); } catch (e) { /* ignore */ }
}

function removeRule(name) {
  const sheet = getSheet();
  for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
    if (sheet.cssRules[i].name === name) {
      sheet.deleteRule(i);
    }
  }
}

let idCounter = 0;

export default function MarqueeText({ children, style }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const nameRef = useRef(`mq${++idCounter}`);
  const [anim, setAnim] = useState(null);
  // Track current overflow to avoid unnecessary updates
  const lastOverflowRef = useRef(-1);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Temporarily kill animation to get true width
    const prevAnim = inner.style.animation;
    inner.style.animation = 'none';
    inner.style.transform = 'translateX(0)';

    // Force reflow so measurement is accurate
    void inner.offsetWidth;

    const ow = outer.offsetWidth;
    const iw = inner.scrollWidth;
    const overflow = iw - ow;

    // Restore previous animation immediately — if we end up
    // setting new state, React will overwrite this anyway
    inner.style.animation = prevAnim;

    // Skip if overflow hasn't meaningfully changed (within 1px)
    if (Math.abs(overflow - lastOverflowRef.current) < 1.5) return;
    lastOverflowRef.current = overflow;

    if (overflow <= 1) {
      removeRule(nameRef.current);
      setAnim(null);
      return;
    }

    // Build keyframes
    const SPEED = 28;
    const PAUSE = 1.4;
    const scrollTime = overflow / SPEED;
    const totalTime = PAUSE + scrollTime + PAUSE + scrollTime;

    const p1 = (PAUSE / totalTime) * 100;
    const p2 = ((PAUSE + scrollTime) / totalTime) * 100;
    const p3 = ((PAUSE + scrollTime + PAUSE) / totalTime) * 100;

    const STEPS = 8;
    const ease = (t) => t * t * (3 - 2 * t);

    const f = [];
    f.push(`0%{transform:translateX(0)}`);
    f.push(`${p1.toFixed(3)}%{transform:translateX(0)}`);

    for (let s = 1; s <= STEPS; s++) {
      const lt = s / STEPS;
      f.push(`${(p1 + (p2 - p1) * lt).toFixed(3)}%{transform:translateX(${(-overflow * ease(lt)).toFixed(2)}px)}`);
    }

    f.push(`${p3.toFixed(3)}%{transform:translateX(${-overflow}px)}`);

    for (let s = 1; s < STEPS; s++) {
      const lt = s / STEPS;
      f.push(`${(p3 + (100 - p3) * lt).toFixed(3)}%{transform:translateX(${(-overflow * (1 - ease(lt))).toFixed(2)}px)}`);
    }

    f.push(`100%{transform:translateX(0)}`);

    const name = nameRef.current;
    insertRule(name, `@keyframes ${name}{${f.join('')}}`);

    setAnim(`${name} ${totalTime.toFixed(3)}s linear infinite`);
  }, []);

  // Observe size changes — handles container resize, font loading, etc.
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    // Initial measure after one frame (fonts / layout)
    const raf = requestAnimationFrame(() => measure());

    const ro = new ResizeObserver(() => measure());
    ro.observe(outer);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeRule(nameRef.current);
    };
  }, [measure]);

  // Re-measure when children change (text content updates)
  // Use a stringified key to avoid re-firing on every render
  const childKey = typeof children === 'string' ? children : String(children);
  useEffect(() => {
    lastOverflowRef.current = -1; // force remeasure
    const raf = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(raf);
  }, [childKey, measure]);

  return (
    <div ref={outerRef} style={{ ...style, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <span
        ref={innerRef}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: anim || 'none',
        }}
      >
        {children}
      </span>
    </div>
  );
}
