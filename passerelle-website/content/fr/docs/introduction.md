---
title: Introduction
---

# Passerelle

Passerelle expose des services locaux via des tunnels Cloudflare éphémères orchestrés par une passerelle auto-hébergée. 

## Architecture

1. **Démon** (`@julesgd/passerelle`) : Tourne sur la machine cible. Ouvre un tunnel Cloudflare et proxifie les requêtes vers les services locaux.
2. **Passerelle** (gateway) : Serveur Hono auto-hébergé. Authentifie les démons via WebSocket, émet des codes à usage unique et sert la PWA.
3. **Tableau de bord** : PWA pour lier les machines, gérer les accès et valider les PINs.
