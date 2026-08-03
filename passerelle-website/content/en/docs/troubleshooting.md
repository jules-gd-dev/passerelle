---
title: Troubleshooting
---

# Troubleshooting

## Cloudflare Rate Limiting (429 Too Many Requests)

When adding or starting many services quickly, you might encounter a **Cloudflare Rate Limit** error:

`[!] CLOUDFLARE RATE LIMIT REACHED for tunnel...`

**Why does this happen?**
Passerelle relies on Cloudflare's free Quick Tunnels (`trycloudflare.com`). To prevent abuse, Cloudflare strictly limits the number of new tunnel requests from a single IP address within a short time window. 

**Is this an issue in production?**
No. In real-world usage, Passerelle runs constantly in the background. The tunnels are started once and remain open for weeks or months. You will only encounter this rate limit during active development when you are rapidly restarting the daemon or adding several services within seconds.

**How to fix it:**
If your IP gets temporarily blocked (usually for 15 minutes to an hour), you can either:
- **Wait** for the restriction to be lifted.
- **Change your IP address** by connecting to a VPN or a mobile hotspot.

*(Note: In the upcoming V2 with BYOD support, you will be able to route unlimited services through a single authenticated tunnel using your own domain, completely removing this restriction).*
