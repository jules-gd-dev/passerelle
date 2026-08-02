---
title: 安装
---

# 安装

## 前置要求

- **Node.js 20+** 与 npm
- 一台你要访问的机器（守护进程）

`cloudflared` 二进制文件会在首次运行时自动下载——你无需自行安装 Cloudflare 工具。

## 安装守护进程

```bash
npm install -g @julesgd/passerelle
```

## 首次设置

```bash
passerelle setup
```

这会向网关注册守护进程、生成身份，并在 PM2 下启动守护进程。你会获得一个 **PIN**，用于在仪表盘中验证该机器。

> 默认情况下，守护进程会向官方网关注册。若要使用你自己的网关，请参阅[自托管网关](/zh/docs/self-host)。

## 获取新的隧道链接

```bash
passerelle link
```

输出一个一次性方框链接，用于打开仪表盘并使用 PIN 验证机器。PIN 在使用后立即轮换。

## 查看状态

```bash
passerelle status
```

阅读 [CLI 参考](/zh/docs/cli)了解所有命令。
