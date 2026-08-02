---
title: CLI 参考
---

# CLI 参考

`passerelle` 命令提供以下子命令。

| 命令 | 说明 |
| --- | --- |
| `passerelle setup` | 向网关注册守护进程、生成身份，并在 PM2 下启动。 |
| `passerelle link` | 输出一次性链接，用于打开仪表盘并用 PIN 验证机器。 |
| `passerelle status` | 显示守护进程状态、隧道 URL 与已注册服务。 |
| `passerelle attach` | 附加到正在运行的守护进程前台 UI。 |
| `passerelle detach` | 分离 UI 而不终止守护进程（在 UI 中 Ctrl+C 也会分离）。 |
| `passerelle version` | 输出守护进程版本与提交哈希（`--json` 输出机器可读格式）。 |
| `passerelle config` | 编辑持久化用户配置（网关 URL、身份）。 |
| `passerelle credits` | 显示项目致谢与链接。 |
| `passerelle restart` | 重启由 PM2 管理的守护进程。 |

## 全局参数

- `-v`, `--version` — `passerelle version` 的别名

## 底层机制

守护进程在 **PM2** 下运行，以便在重启后继续存活。`passerelle restart` 会重新加载已构建的 `dist/`，无需重新安装包。
