const FONT_HREF = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap";

export function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.querySelector('link[href*="Sora"]')) return;
  const fontLink = document.createElement("link");
  fontLink.href = FONT_HREF;
  fontLink.rel = "stylesheet";
  document.head.appendChild(fontLink);
}
