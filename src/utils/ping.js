// Fire-and-forget visit ping for the hosted webapp.
// Skipped for dev (localhost) and for the Electron build (file://). Dedup'd
// per browser tab via sessionStorage so refreshes don't re-fire.

const PING_URL = "https://tracelab-ping.nick-da4.workers.dev/";
const HOST = "nickcason.github.io";
const SESSION_KEY = "tracelab:pinged";

export function reportVisit(version) {
  if (typeof window === "undefined") return;
  if (window.location.hostname !== HOST) return;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Private mode or storage disabled — fall through and ping anyway.
  }

  const payload = JSON.stringify({
    version: version || "",
    path: window.location.pathname,
  });

  try {
    fetch(PING_URL, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => {});
  } catch {
    // Never let the ping break the app.
  }
}
