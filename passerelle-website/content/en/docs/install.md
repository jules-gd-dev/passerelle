---
title: Install
---

# Install

Require: Node.js 20+. `cloudflared` downloads automatically.

## Daemon

```bash
npm install -g @julesgd/passerelle
passerelle setup
```

Registers with gateway, generates identity, starts under PM2. Returns a **PIN** to validate in dashboard.

## Validation Link

```bash
passerelle link
```

Shows one-time link to open dashboard. PIN rotates after use.

## Status

```bash
passerelle status
```
