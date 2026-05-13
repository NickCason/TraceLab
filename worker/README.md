# tracelab-ping worker

Tiny Cloudflare Worker that receives a fire-and-forget POST from the TraceLab
webapp on first load per browser session and forwards a Pushover notification
with the visitor's edge metadata (country, city, ASN, UA, IP).

## Deploy

```bash
cd worker
npx wrangler@latest deploy
```

## Secrets

```bash
npx wrangler@latest secret put PUSHOVER_USER
npx wrangler@latest secret put PUSHOVER_TOKEN
```

## Config

`wrangler.toml` vars:

- `ALLOWED_ORIGIN` — only this origin's POSTs get through (default
  `https://nickcason.github.io`).
- `RATE_LIMIT_PER_MINUTE` — per-IP cap, in-memory per isolate (default `20`).

## Smoke test

```bash
curl -X POST https://tracelab-ping.<account>.workers.dev/ \
  -H "Origin: https://nickcason.github.io" \
  -H "Content-Type: application/json" \
  -d '{"version":"0.1.0","path":"/"}'
```

You should get a Pushover notification within a couple seconds.
