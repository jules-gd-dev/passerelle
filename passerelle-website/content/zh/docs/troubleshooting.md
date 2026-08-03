---
title: 故障排除
---

# 故障排除 (Troubleshooting)

## Cloudflare 速率限制 (Rate Limit / 429 错误)

快速添加或启动许多服务时，您可能会遇到 **Cloudflare 速率限制**错误：

`[!] CLOUDFLARE RATE LIMIT REACHED for tunnel...`

**为什么会这样？**
Passerelle 依赖 Cloudflare 的免费 Quick Tunnels (`trycloudflare.com`)。为防止滥用，Cloudflare 严格限制了短时间内来自同一 IP 地址的新隧道请求数量。

**这在生产环境中是个问题吗？**
不。在实际使用中，Passerelle 会一直在后台运行。隧道启动一次后将保持开启数周或数月。您只会在主动开发期间遇到此限制（例如，在几秒钟内快速重启守护进程或添加多个服务）。

**如何解决：**
如果您的 IP 暂时被屏蔽（通常为 15 分钟到一小时），您可以：
- **等待** 限制被解除。
- **更改您的 IP 地址**，例如连接 VPN 或手机移动热点。

*(注意：在即将到来的具有 BYOD 支持的 V2 中，您将能够使用自己的域名通过单个经过身份验证的隧道路由无限制的服务，完全消除此限制)。*
