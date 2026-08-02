---
title: CLI Reference
---

# CLI Reference

Passerelle includes a powerful CLI to manage your local daemon, interactive UI, and configurations.

## Core Commands

| Command | Description |
| --- | --- |
| `passerelle setup` | Install and start the background PM2 daemon service. |
| `passerelle link` | Output direct login URL or terminal QR Code for Handoff. |
| `passerelle status` | Display diagnostics summary and running service state. |
| `passerelle ui` | Connect directly to the live interactive terminal dashboard. |
| `passerelle version` | Show version and commit (`--json` available). |
| `passerelle config` | View or update persistent local settings. |
| `passerelle register` | Re-declare daemon presence directly to the Gateway. |
| `passerelle restart` | Restart the PM2 background daemon. |

---

## Interactive Management (`passerelle ui`)

Connecting to `passerelle ui` opens a live, real-time management console in your terminal. You can invoke instant actions via these keyboard shortcuts:

- `[r]` **Renew PIN**: Immediately generate a new security PIN and expire existing access credentials.
- `[s]` **Copy Link**: Copy the direct web login connection URL to your clipboard.
- `[c]` / `[l]` **View Status & Services**: Inspect active remote sessions and local HTTP servers.
- `[h]` **Privacy Mode**: Toggle QR Code visibility for screen sharing in public environments.
- `[k]` **Kill Sessions**: Terminate all active remote client sessions instantaneously.
- `[p]` **Re-register**: Synchronize daemon presence to the Gateway.
- `[d]` **Detach**: Detach from the interactive console while leaving the PM2 service running.

---

## Configuration

Settings are stored in `~/.config/passerelle/passerelle-config.json` (created by `passerelle setup`).

### Command Allowlist

By default, any authenticated web client can start services listed in your `services.json`. To restrict which commands can be launched via the web API, set a strict allowlist:

```bash
passerelle config command_allowlist "opencode,kilo,pm2"
```

To remove restrictions, clear the allowlist:

```bash
passerelle config command_allowlist ""
```

### Revoking API Access

To instantly revoke all 30-day fixed API tokens (used by scripts), set the revocation timestamp to now:

```bash
passerelle config api_revoked_before $(date +%s)
```
