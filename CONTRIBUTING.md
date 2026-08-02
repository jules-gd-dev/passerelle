# Contributing to Passerelle

First off, thank you for considering contributing to Passerelle! It's people like you that make open-source software such a great community.

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally.
3. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Environment

Passerelle consists of three main parts: the CLI daemon, the Cloud Gateway, and the Website. 

To work on the local Gateway and Web stack:
```bash
docker compose -f docker-compose.dev.yml up
```
This spins up the API and Web services, accessible via a local development tunnel.

## Code Standards & Testing

We use strict linting and formatting to ensure code quality. Before submitting a PR, ensure you run:

```bash
# Format code
npm run format

# Run linter
npm run lint

# Run test suite
npm test
```

## Pull Request Process

1. Create a new branch for your feature or bugfix (`git checkout -b feature/my-new-feature`).
2. Make your changes and write tests if applicable.
3. Ensure your commits are descriptive and follow conventional commits style.
4. Push your branch and open a Pull Request against the `main` branch.
5. Once your PR is reviewed and approved, it will be merged by a maintainer.

## AI Agents & Automation

AI-generated contributions and autonomous agent Pull Requests are explicitly welcome! As long as the code strictly respects the linting, formatting, and design guidelines of the project, we gladly accept them. We recognize that these rules and the nature of software development itself will evolve rapidly, and we are excited to adapt alongside the ecosystem.

## Reporting Bugs

If you find a bug, please open an issue on GitHub with a clear description, reproduction steps, and logs if available.

Thank you for helping make Passerelle better!
