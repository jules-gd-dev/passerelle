---
title: Modèle de sécurité
---

# Modèle de sécurité

- **Authentification** : Enregistrement via secret machine. Ré-enregistrement avec même `machineId` et secret différent rejeté.
- **Tokens** : Le token de session est stocké dans un cookie httpOnly chiffré AES-256-GCM (`__Host-passerelle_sessions`). Jamais accessible au navigateur.
- **Ouverture de service** : Utilise un code handoff à usage unique transmis via WebSocket. Les tokens n'apparaissent jamais dans les URLs.
- **PINs** : Invalidés immédiatement après usage.
- **SSRF** : Le proxy rejette les adresses privées et link-local.
- **Rate Limit** : Validation PIN, proxy et API publiques limités par IP.
- **Défense** : Démon sous PM2 (moindre privilège), conteneur passerelle durci (capabilities droppées).
