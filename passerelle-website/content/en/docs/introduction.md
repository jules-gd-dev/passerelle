---
title: Introduction
---

# Passerelle

Passerelle exposes local services through ephemeral Cloudflare tunnels orchestrated by a self-hosted gateway.

## Architecture

1. **Daemon** (`@julesgd/passerelle`): Runs on target machine. Opens Cloudflare tunnel, proxies requests to local services.
2. **Gateway**: Self-hosted Hono server. Authenticates daemons via WebSocket, issues one-time codes, serves PWA.
3. **Dashboard**: PWA to link machines, manage access, validate PINs.
