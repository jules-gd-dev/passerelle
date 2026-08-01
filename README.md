# Passerelle

Zero-knowledge tunneling & remote service manager. Expose local services through ephemeral Cloudflare tunnels, orchestrated by a self-hosted gateway — without ever leaking long-lived tokens to the browser.

```
 daemon (client) ──WS──▶ gateway (api) ◀──HTTP── PWA (web) ──▶ user
   │ tunnel             │ relay + registry        │ dashboard
   └─ cloudflared        └─ cloudflared            └─ browser
```

## Repository layout

| Path | What | Stack |
| --- | --- | --- |
| `passerelle-client/` | Daemon CLI (npm package `@julesgd/passerelle`). Runs on each machine you want to reach; opens a Cloudflare tunnel and proxies requests to local services. | Node 20, TypeScript, tsup |
| `passerelle-cloud/api/` | Gateway server. Authenticates daemons over WebSocket, issues short-lived handoff codes, stores machine↔secret bindings, serves the public API. | Node 20, Hono, vitest |
| `passerelle-cloud/web/` | Progressive Web App dashboard. Connect machines, open services, manage PINs/tokens. | React, Vite, react-i18next, vitest |

## Install the daemon

```bash
npm install -g @julesgd/passerelle
passerelle setup
```

The `cloudflared` binary is downloaded automatically on first run.

## Self-host the gateway

See `passerelle-cloud/.env.example` for required configuration (Cloudflare tunnel UUID, session-cookie key, version policy).

```bash
cd passerelle-cloud
cp .env.example .env   # fill in real values
docker compose -f docker-compose.prod.yml up -d
```

## Develop

Each subproject is independent (its own `package.json` and lockfile):

```bash
# client
cd passerelle-client   && npm ci && npm run build
# gateway api
cd passerelle-cloud/api && npm ci && npm test
# web pwa
cd passerelle-cloud/web && npm ci && npm run build
```

## Security model

- Daemons register with the gateway over WebSocket using a per-machine secret (C2 handshake).
- The PWA never holds a long-lived session token: it lives in an httpOnly, AES-256-GCM encrypted cookie on the gateway.
- Opening a service exchanges a one-time handoff code (pushed over the trusted WS) so tokens never appear in redirect URLs.
- PINs are rotated immediately after validation.

See the inline `H1`–`H6` / `C2` comments in the source for the rationale behind each hardening step.

## Credits

**Author**: Jules GD ([julesgd.dev](https://www.julesgd.dev)) · **GitHub**: [jules-gd-dev/passerelle](https://github.com/jules-gd-dev/passerelle) · **Sponsors**: [GitHub Sponsors](https://github.com/sponsors/jules-gd-dev) · **License**: MIT
