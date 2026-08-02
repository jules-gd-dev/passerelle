---
title: Référence CLI
---

# Référence CLI

Passerelle inclut un CLI puissant pour gérer votre daemon local, votre UI interactive, et vos configurations.

## Commandes Principales

| Commande | Description |
| --- | --- |
| `passerelle setup` | Installe et démarre le daemon en arrière-plan via PM2. |
| `passerelle link` | Affiche l'URL de login directe ou le QR Code terminal pour le Handoff. |
| `passerelle status` | Affiche l'état du service et des diagnostics en temps réel. |
| `passerelle ui` | Se connecte directement au tableau de bord terminal interactif. |
| `passerelle version` | Affiche la version et le commit (`--json` disponible). |
| `passerelle config` | Consulte ou modifie les paramètres locaux persistants. |
| `passerelle register` | Re-déclare instantanément le daemon auprès de la Gateway. |
| `passerelle restart` | Redémarre le daemon PM2 en arrière-plan. |

---

## Console Interactive (`passerelle ui`)

Lancer `passerelle ui` ouvre une console de gestion en temps réel dans votre terminal. Vous pouvez invoquer ces actions instantanément via les raccourcis clavier :

- `[r]` **Renouveler le PIN** : Génère immédiatement un nouveau code PIN et expire les accès existants.
- `[s]` **Copier le lien** : Copie l'URL de connexion directe dans le presse-papier.
- `[c]` / `[l]` **Voir le Statut** : Inspecte les sessions à distance actives et les serveurs locaux en cours d'exécution.
- `[h]` **Mode Privé** : Masque le QR code et le PIN (utile lors des partages d'écran en réunion).
- `[k]` **Tuer les sessions** : Coupe toutes les sessions distantes instantanément.
- `[p]` **Re-déclarer** : Synchronise à nouveau la présence du daemon avec la Gateway.
- `[d]` **Détacher** : Quitte la console interactive en laissant le daemon PM2 tourner en fond.

---

## Configuration

Les paramètres sont stockés dans `~/.config/passerelle/passerelle-config.json`.

### Liste Blanche (Allowlist)

Par défaut, tout client web authentifié peut lancer n'importe quel service listé dans votre `services.json`. Pour restreindre les commandes autorisées via l'API, définissez une liste blanche stricte :

```bash
passerelle config command_allowlist "opencode,kilo,pm2"
```

Pour supprimer toutes les restrictions, videz la liste :

```bash
passerelle config command_allowlist ""
```

### Révocation d'Accès API

Pour révoquer immédiatement tous les tokens API (durée fixe de 30 jours, utilisés pour les scripts), définissez la date de révocation à maintenant :

```bash
passerelle config api_revoked_before $(date +%s)
```
