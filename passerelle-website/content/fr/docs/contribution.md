---
title: Contribuer
---

# Contribuer

Merci de l'intérêt que vous portez à Passerelle ! Nous accueillons toutes les contributions, des rapports de bugs aux nouvelles fonctionnalités.

## Démarrage Rapide

Pour configurer l'environnement de développement, vous aurez besoin de Docker et Node.js.

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/jules-gd-dev/passerelle.git
   cd passerelle
   ```

2. **Lancer l'environnement de développement** :
   Passerelle utilise Docker Compose pour orchestrer l'API Gateway, le Dashboard Web et le tunnel Cloudflare.
   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

3. **Installer les dépendances du CLI** :
   ```bash
   npm install
   ```

## Qualité du Code

Nous appliquons des règles strictes de formatage et de linting. Avant d'ouvrir une Pull Request, assurez-vous que votre code passe toutes les vérifications :

```bash
# Formater le code
npm run format

# Lancer le linter
npm run lint

# Lancer les tests
npm test
```

## Soumettre des Modifications

1. Créez une branche de fonctionnalité : `git checkout -b feature/ma-fonctionnalite`
2. Poussez vos commits en respectant la spécification [Conventional Commits](https://www.conventionalcommits.org/).
3. Ouvrez une Pull Request.
4. Une fois fusionnée, n'hésitez pas à ajouter votre nom au fichier `AUTHORS.md` à la racine du dépôt !

## Agents IA & Automatisation

Les contributions générées par l'IA et les Pull Requests d'agents autonomes sont explicitement les bienvenues ! Tant que le code respecte scrupuleusement les règles de linting, de formatage et les directives de design du projet, nous les acceptons avec plaisir. Nous avons conscience que ces règles, ainsi que l'évolution même du métier, sont amenées à changer rapidement, et nous sommes ravis d'évoluer avec l'écosystème.
