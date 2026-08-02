---
title: Self-host
---

# Self-host

## Configuration

Require: Cloudflare tunnel (`cloudflared tunnel create`).

```ini
# .env
TUNNEL_UUID=<your-tunnel-uuid>
TUNNEL_CREDENTIALS_PATH=/etc/cloudflared/<your-tunnel-uuid>.json
TUNNEL_HOSTNAME=<your-tunnel-hostname>
SESSION_COOKIE_KEY=<32-byte-hex-key>
```

> Generate key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Start

```bash
docker compose -f docker-compose.prod.yml up -d
```

Services: `app` (API + PWA), `tunnel` (cloudflared). Volume `passerelle-data` stores identities.

## Usage

Provide URL to daemon during `passerelle setup`, or edit with `passerelle config`.
