# Passerelle

**Passerelle** est une application permettant de piloter des CLIs de code IA depuis un téléphone portable via une PWA Mobile sécurisée et un Daemon local.

## 🏗️ Architecture & Cloudflare Tunnel

L'application est sécurisée avec **Cloudflare Tunnel**. Aucun port réseau n'est directement exposé sur la machine hôte. Tout le trafic transitant vers l'application passe par le tunnel sécurisé Cloudflare.

En environnement de développement comme en production, l'application est accessible uniquement via le nom de domaine :
**`https://passerelle-dev-instance.julesgd.dev`**

---

## 🛠️ Configuration du Tunnel Cloudflare

Le tunnel `passerelle-dev-instance` est configuré avec les fichiers suivants :
- **Fichier d'environnement local** : `.env` à la racine contenant `TUNNEL_UUID`, `TUNNEL_CREDENTIALS_PATH` et `TUNNEL_HOSTNAME`.
- **Fichier de routing Dev** : `cloudflared/config.yml` (pointe vers `http://api:8787`).
- **Fichier de routing Prod** : `cloudflared/config.prod.yml` (pointe vers `http://app:8787`).

---

## 🚀 Démarrage

### Développement avec Docker Compose
```bash
docker compose -f docker-compose.dev.yml up
```
*Le service `tunnel` démarre en même temps que les services `api` et `web` et expose l'application sur `https://passerelle-dev-instance.julesgd.dev`.*

### Production avec Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🧪 Tests & Linting

Exécution des tests Vitest (API & Web) :
```bash
npm test
```

Vérification du linter & formateur Biome :
```bash
npm run lint
npm run format
```

Exécution des tests en conteneur Docker CI :
```bash
docker compose -f docker-compose.tests.yml up --build
```
