---
title: Installation
---

# Installation

Prérequis: Node.js 20+. `cloudflared` est téléchargé automatiquement.

## Démon

```bash
npm install -g @julesgd/passerelle
passerelle setup
```

S'enregistre auprès de la passerelle, génère une identité, démarre sous PM2. Retourne un **PIN** à valider dans le tableau de bord.

## Lien de validation

```bash
passerelle link
```

Affiche un lien à usage unique pour ouvrir le dashboard. Le PIN est roté après usage.

## Statut

```bash
passerelle status
```
