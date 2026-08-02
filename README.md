# Passerelle

Zero-knowledge tunneling & remote service manager. Expose local services through ephemeral Cloudflare tunnels, orchestrated by a self-hosted gateway — without leaking long-lived tokens to the browser.

```
 daemon (client) ──WS──▶ gateway (api) ◀──HTTP── PWA (web) ──▶ user
   │ tunnel             │ relay + registry        │ dashboard
   └─ cloudflared        └─ cloudflared            └─ browser
```

## Repository layout

| Path | What | Stack |
| --- | --- | --- |
| `passerelle-client/` | Daemon CLI. Opens Cloudflare tunnel and proxies requests. | Node 20, TypeScript |
| `passerelle-cloud/api/` | Gateway server. Authenticates daemons, issues handoff codes. | Node 20, Hono |
| `passerelle-cloud/web/` | PWA dashboard. Manage tunnels and machines. | React, Vite |

## Install daemon

```bash
npm install -g @julesgd/passerelle
passerelle setup
```

`cloudflared` is downloaded automatically.

## Self-host gateway

See `passerelle-cloud/.env.example` for required config.

```bash
cd passerelle-cloud
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d
```

## Develop

```bash
cd passerelle-client && npm ci && npm run build
cd ../passerelle-cloud/api && npm ci && npm test
cd ../web && npm ci && npm run build
```

## Security

- Daemons register over WebSocket using per-machine secret.
- Session token lives in httpOnly, encrypted cookie.
- Opening a service exchanges one-time handoff code.
- PINs are rotated immediately.

License: MIT
