---
title: 自托管网关
---

# 自托管网关

网关是一个小型的 Hono 服务器，通过 WebSocket 认证守护进程、存储机器↔秘密绑定，并提供仪表盘 PWA。它通过 Cloudflare 隧道暴露到互联网。

## 前置要求

- 一个 Cloudflare 账户，以及用 `cloudflared tunnel create <名称>` 创建的隧道——记下**隧道 UUID** 与生成的凭证 JSON。
- 一个指向该隧道的主机名（例如 `passerelle.example.com`）。

## 配置

复制环境模板并填入你的值：

```ini
# .env
TUNNEL_UUID=<你的隧道uuid>
TUNNEL_CREDENTIALS_PATH=/etc/cloudflared/<你的隧道uuid>.json
TUNNEL_HOSTNAME=<你的隧道主机名>

# 32 字节的十六进制密钥——用以下命令生成：
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_COOKIE_KEY=
```

`SESSION_COOKIE_KEY` 用于加密 `__Host-passerelle_sessions` cookie。它在重启间**必须保持稳定**，否则每次部署都会使所有浏览器会话失效。

## 启动

```bash
docker compose -f docker-compose.prod.yml up -d
```

这会启动三个服务：

- `app` —— 网关 API + 静态 PWA，已加固（丢弃 capabilities、禁止提权）。
- `tunnel` —— 在你的主机名上暴露网关的 `cloudflared`。
- 一个 `passerelle-data` 卷，存放机器注册表——在部署间保留它，以免守护进程被重新质询。

## 将守护进程指向你的网关

在 `passerelle setup` 时提供你的网关 URL（而非官方的），或稍后用 `passerelle config` 编辑。

阅读[安全模型](/zh/docs/security)以理解每一项加固所防护的内容。
