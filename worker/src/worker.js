// TraceLab visit-ping worker.
// Receives a POST from the TraceLab webapp on first load per session,
// enriches it with Cloudflare edge data, and forwards a Pushover notification.

const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";

// In-memory rate limiter (per worker isolate). Good enough for low traffic.
// Keyed by client IP. Drops the request if the IP has exceeded the per-minute
// budget so a runaway loop can't burn the Pushover quota.
const rateBuckets = new Map();

function rateLimit(ip, perMinute) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (rateBuckets.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= perMinute) {
    rateBuckets.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return true;
}

function corsHeaders(origin, allowedOrigin) {
  const ok = origin === allowedOrigin;
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function shortUA(ua) {
  if (!ua) return "unknown UA";
  // Strip the verbose Mozilla preamble and keep the bits that actually matter.
  const browser =
    ua.match(/Edg\/[\d.]+/) ||
    ua.match(/OPR\/[\d.]+/) ||
    ua.match(/Chrome\/[\d.]+/) ||
    ua.match(/Firefox\/[\d.]+/) ||
    ua.match(/Safari\/[\d.]+/);
  const os =
    (ua.match(/Windows NT ([\d.]+)/) && `Win ${RegExp.$1}`) ||
    (ua.match(/Mac OS X ([\d_]+)/) && `macOS ${RegExp.$1.replace(/_/g, ".")}`) ||
    (ua.match(/Android ([\d.]+)/) && `Android ${RegExp.$1}`) ||
    (ua.match(/iPhone OS ([\d_]+)/) && `iOS ${RegExp.$1.replace(/_/g, ".")}`) ||
    (ua.includes("Linux") && "Linux") ||
    "unknown OS";
  return `${browser ? browser[0] : "unknown browser"} on ${os}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN;
    const cors = corsHeaders(origin, allowed);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET") {
      // Cheap health check.
      return new Response("tracelab-ping ok\n", {
        status: 200,
        headers: { "Content-Type": "text/plain", ...cors },
      });
    }

    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405, headers: cors });
    }

    if (origin !== allowed) {
      return new Response("forbidden origin", { status: 403, headers: cors });
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const perMinute = parseInt(env.RATE_LIMIT_PER_MINUTE || "20", 10);
    if (!rateLimit(ip, perMinute)) {
      return new Response("rate limited", { status: 429, headers: cors });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional — proceed with an empty payload.
    }

    const cf = request.cf || {};
    const country = request.headers.get("cf-ipcountry") || cf.country || "??";
    const city = cf.city || "";
    const region = cf.region || "";
    const asn = cf.asOrganization || cf.asn || "";
    const ua = shortUA(request.headers.get("user-agent") || "");
    const referer = request.headers.get("referer") || "";
    const version = typeof body.version === "string" ? body.version : "";
    const path = typeof body.path === "string" ? body.path : "";

    const locBits = [country, region, city].filter(Boolean).join(" · ");
    const asnBit = asn ? ` · ${asn}` : "";
    const verBit = version ? `v${version}` : "";
    const pathBit = path && path !== "/" ? ` ${path}` : "";

    const title = "TraceLab opened";
    const message =
      `${locBits}${asnBit}\n` +
      `${ua}\n` +
      `${ip}` +
      (verBit || pathBit ? `\n${verBit}${pathBit}` : "") +
      (referer ? `\n${referer}` : "");

    const form = new URLSearchParams();
    form.set("token", env.PUSHOVER_TOKEN);
    form.set("user", env.PUSHOVER_USER);
    form.set("title", title);
    form.set("message", message);
    form.set("priority", "0");

    const resp = await fetch(PUSHOVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return new Response(`pushover error: ${detail}`, {
        status: 502,
        headers: cors,
      });
    }

    return new Response("ok", { status: 202, headers: cors });
  },
};
