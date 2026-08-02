---
title: Security Model
---

# Security Model

- **Authentication**: Registration via machine secret. Re-registration with same `machineId` and different secret rejected.
- **Direct Access Tokens**: Short-lived handoff tokens generated via WebSocket to authorize direct browser connections without passing credentials in URLs.
- **Tokens**: Session token stored in httpOnly AES-256-GCM encrypted cookie (`__Host-passerelle_sessions`). Never accessible to browser.
- **Service Access**: Uses one-time handoff code via WebSocket. Tokens never appear in URLs.
- **PINs**: Invalidated immediately after use.
- **SSRF**: Proxy rejects private and link-local addresses.
- **Rate Limit**: PIN validation, proxy, and public APIs limited per IP.
- **Defense**: Daemon runs under PM2 (least privilege), gateway container hardened (capabilities dropped).
