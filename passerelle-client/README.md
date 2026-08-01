```text
██████╗  █████╗ ███████╗███████╗███████╗██████╗ ███████╗██╗     ██╗     ███████╗
██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝██║     ██║     ██╔════╝
██████╔╝███████║███████╗███████╗█████╗  ██████╔╝█████╗  ██║     ██║     █████╗  
██╔═══╝ ██╔══██║╚════██║╚════██║██╔══╝  ██╔══██╗██╔══╝  ██║     ██║     ██╔══╝  
██║     ██║  ██║███████║███████║███████╗██║  ██║███████╗███████╗███████╗███████╗
╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝
```

[English](README.md) | [Français](README_fr.md) | [中文](README_zh.md)

# Passerelle Client & Daemon

Passerelle is an open-source, secure tunneling and local service discovery daemon designed for modern software developers. It creates effortless, zero-configuration remote access bridges to your local development servers while retaining strict local authentication control.

---

## Why Open-Source Client Code Guarantees Your Security

Open-sourcing the Passerelle daemon architecture provides absolute algorithmic transparency and robust trust for end-users:
* **Zero-Knowledge Local Authentication**: Your PIN is generated and verified directly on your local workstation. The Gateway acts solely as an untrusted WebSocket relay. If an incoming connection presents an invalid PIN, the daemon rejects it instantly.
* **Transparent Remote Service Control**: As a service manager, the daemon **can start and stop the local CLI processes you explicitly configure** (and proxy traffic to them). Treat any valid session token as full control of those configured services: only connect machines and generate API tokens you personally trust, and keep your PIN private. There is no hidden, undocumented execution path beyond the services listed in `services.json`.
* **Transparent Telemetry & Sovereignty**: Metadata is strictly limited to health heartbeats and discovered service summaries. You are never locked in and can easily configure a custom Gateway instance.

---

## Quick Start & Interactive Management (`passerelle ui`)

### 1. Installation & Start
```bash
npm install -g @julesgd/passerelle
passerelle setup
```

### 2. Live Interactive Management Console
To actively manage your daemon, monitor tunnels, and control sessions in real time, connect to the interactive UI:
```bash
passerelle ui
```
Once attached, you can invoke instant management actions via keyboard shortcuts:
* `[r]` **Renew PIN**: Immediately generate a new security PIN code and expire existing access credentials.
* `[s]` **Copy Link**: Copy the direct web login connection URL directly to your clipboard.
* `[c]` / `[l]` **View Status & Services**: Inspect active connection sessions and running local development HTTP servers.
* `[h]` **Privacy Mode**: Toggle QR Code and PIN visibility for screen sharing in public or office environments.
* `[k]` **Kill Sessions**: Terminate all active remote client sessions instantaneously.
* `[p]` **Re-register**: Synchronize and re-declare daemon presence to the Gateway (or run `passerelle register`).
* `[d]` **Detach**: Detach from the interactive terminal console while leaving the PM2 service running in the background.

---

## CLI Command Reference

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `setup / start`| None | Install and start the background PM2 daemon service |
| `stop / restart`| None | Stop or restart the running background service |
| `status / json`| None | Display diagnostics summary or raw machine-readable state |
| `link / qr` | None | Output direct login URL or render terminal QR Code & PIN |
| `register / sync`| None | Re-declare and synchronize daemon presence directly with Gateway |
| `config` | `<key> <val>` | View or update local settings (`gateway_url`, `machine_id`, etc.) |
| `credits` | None | Display project author, github repo, donations, and message |
| `ui / attach` | None | Connect directly to the live interactive terminal dashboard |
| `logs / help` | None | Stream real-time logs from PM2 or display command reference |

---

## Configuration: Environment Variables & `commandAllowlist`

All settings live in `~/.config/passerelle/passerelle-config.json` (created by `passerelle setup`, mode 0600). They can be overridden per-launch with environment variables:

| Variable | Purpose |
| :--- | :--- |
| `GATEWAY_WEB_URL` | Gateway base URL to register against (default: the one stored in config, or `https://passerelle-cloud.julesgd.dev`) |
| `GATEWAY_WS_URL` | Gateway WebSocket URL (defaults to `wss://<gateway>/ws`) |
| `DEBUG` / `--debug` | Enable verbose daemon logging |
| `BOUNCER_URL` / `PORT` | Local daemon listen port (default 3000) |
| `XDG_CONFIG_HOME` | Override the config directory (Linux/macOS) |

### Restricting which commands the daemon may start (H1)

By default any authenticated web client can start any service listed in `services.json`. To restrict which commands can be launched via the web API, set an allowlist:

```bash
passerelle config command_allowlist "opencode,kilo,pm2"
```

Only these commands (or their basenames) will then be accepted by `/api/start`. An empty value clears the allowlist (unrestricted):

```bash
passerelle config command_allowlist ""
```

The same value can be set directly in `passerelle-config.json` as `"commandAllowlist": ["opencode"]`.

### Revoking access

* **Revoke all API tokens** (30-day fixed tokens used by scripts): `passerelle config api_revoked_before` with a current Unix timestamp — or use the **Révoquer tous les tokens API** button in the web dashboard.
* **Revoke every session** (web logins): `passerelle ui` → press `[k]` (Kill Sessions).
* **Expire credentials immediately**: `passerelle ui` → press `[r]` (Renew PIN).

---

## Frequently Asked Questions (FAQ) & Troubleshooting

* **My login link returns a "Tunnel Error" or cannot be reached?**
  -> This is normal after extended idling or network changes! Your underlying Cloudflare tunnel URL probably renewed. Simply click your connection link again from the Gateway dashboard (`passerelle-cloud.julesgd.dev`) or execute `passerelle link` to retrieve your fresh URL.
* **The Gateway indicates that my daemon is inaccessible or offline?**
  -> Verify that your local service is active by running `passerelle status`. If running, re-declare your daemon presence to the Gateway instantly by executing `passerelle register` (or pressing `[p]` inside `passerelle ui`).
* **How do I immediately revoke access or lock down active remote sessions?**
  -> Open `passerelle ui` and press `[k]` to terminate all active sessions instantly, or press `[r]` to regenerate your PIN code so previously authenticated browsers can no longer interact with your services.
* **How do I add or configure my own custom local services and servers?**
  -> Passerelle manages your development services directly from your local `services.json` configuration file (supporting `cli` command processes, `docker` containers, and `network` forwarding ports). Simply edit this file or add your applications directly via the web management dashboard to make them available for secure remote tunneling!
* **Can I hide my sensitive credentials during meetings or demonstrations?**
  -> Yes! Inside `passerelle ui`, simply press `[h]` to turn on Privacy Mode, which immediately replaces your visible QR Code and PIN code with lock masks on your terminal display.
* **How do I configure Passerelle to use a custom or corporate self-hosted Gateway?**
  -> Run `passerelle config gateway_url https://my-custom-gateway.company.org` and restart your service with `passerelle restart`. (*Note: The backend Passerelle Gateway relay codebase is soon to be open-sourced as well!*)
* **What happens to my running services if I reboot my computer?**
  -> Since Passerelle is managed via PM2, you can quickly restore your background tunneling service after a reboot by simply executing `passerelle setup` from any terminal.

---

## Project Credits & Acknowledgments
* **Author**: Jules GD (julesgd.dev) | **GitHub**: [jules-gd-dev/paserelle](https://github.com/jules-gd-dev/paserelle) | **Sponsors**: [Support on GitHub](https://github.com/sponsors/jules-gd-dev) | **License**: MIT
