---
title: 贡献指南
---

# 贡献指南

感谢您对 Passerelle 的关注！我们欢迎所有的贡献，无论是提交 Bug 报告还是开发新功能。

## 快速开始

要设置开发环境，您需要安装 Docker 和 Node.js。

1. **克隆仓库**：
   ```bash
   git clone https://github.com/jules-gd-dev/passerelle.git
   cd passerelle
   ```

2. **启动开发环境**：
   Passerelle 使用 Docker Compose 来编排网关 API、Web 仪表盘和 Cloudflare 隧道。
   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

3. **安装 CLI 依赖**：
   ```bash
   npm install
   ```

## 代码质量

我们执行严格的代码格式化和静态检查。在提交 Pull Request 之前，请确保您的代码通过所有测试：

```bash
# 格式化代码
npm run format

# 运行代码检查 (Linter)
npm run lint

# 运行测试
npm test
```

## 提交更改

1. 创建一个特性分支：`git checkout -b feature/my-feature`
2. 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范提交您的更改。
3. 推送分支并开启 Pull Request。
4. 代码合并后，欢迎将您的名字添加到仓库根目录的 `AUTHORS.md` 文件中！

## AI 代理与自动化

我们明确欢迎由 AI 生成的贡献和自主代理提交的 Pull Request！只要代码严格遵守本项目的代码检查 (Linting)、格式化和设计准则，我们都会乐意接受。我们认识到，随着软件工程本身性质的快速发展，这些规则将不断演变，我们非常期待与整个生态系统共同适应和进化。
