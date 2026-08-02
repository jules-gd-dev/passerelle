---
title: Contributing
---

# Contributing

Thank you for your interest in contributing to Passerelle! We welcome all contributions, from bug reports to new features.

## Getting Started

To set up the development environment, you will need Docker and Node.js installed.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jules-gd-dev/passerelle.git
   cd passerelle
   ```

2. **Start the development environment**:
   Passerelle uses Docker Compose to orchestrate the Gateway API, Web Dashboard, and Cloudflare Tunnel.
   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

3. **Install CLI dependencies**:
   ```bash
   npm install
   ```

## Code Quality

We enforce strict formatting and linting. Before opening a Pull Request, please ensure your code passes all checks:

```bash
# Format code
npm run format

# Run linter
npm run lint

# Run tests
npm test
```

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit your changes following the [Conventional Commits](https://www.conventionalcommits.org/) specification.
3. Push your branch and open a Pull Request.
4. Once merged, feel free to add your name to the `AUTHORS.md` file at the root of the repository!

## AI Agents & Automation

AI-generated contributions and autonomous agent Pull Requests are explicitly welcome! As long as the code strictly respects the linting, formatting, and design guidelines of the project, we gladly accept them. We recognize that these rules and the nature of software development itself will evolve rapidly, and we are excited to adapt alongside the ecosystem.
