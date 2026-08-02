---
title: Auto-héberger la passerelle
---

# Auto-héberger la passerelle

## Configuration

Nécessite: tunnel Cloudflare (`cloudflared tunnel create`).

```ini
# .env
TUNNEL_UUID=<votre-uuid-tunnel>
TUNNEL_CREDENTIALS_PATH=/etc/cloudflared/<votre-uuid-tunnel>.json
TUNNEL_HOSTNAME=<votre-hostname-tunnel>
SESSION_COOKIE_KEY=<clé-hex-32-octets>
```

> Générer une clé: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Démarrage

```bash
docker compose -f docker-compose.prod.yml up -d
```

Services: `app` (API + PWA), `tunnel` (cloudflared). Volume `passerelle-data` stocke les identités.

## Utilisation

Fournir l'URL au démon lors du `passerelle setup`, ou éditer avec `passerelle config`.
