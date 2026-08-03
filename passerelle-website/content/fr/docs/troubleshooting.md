---
title: Dépannage
---

# Dépannage (Troubleshooting)

## Limite de requêtes Cloudflare (Rate Limit / Erreur 429)

Lors de l'ajout ou du démarrage rapide de nombreux services, vous pouvez rencontrer une erreur de **Rate Limit Cloudflare** :

`[!] CLOUDFLARE RATE LIMIT REACHED for tunnel...`

**Pourquoi cela se produit-il ?**
Passerelle s'appuie sur les "Quick Tunnels" gratuits de Cloudflare (`trycloudflare.com`). Pour éviter les abus, Cloudflare limite strictement le nombre de demandes de nouveaux tunnels depuis une même adresse IP dans un court laps de temps.

**Est-ce un problème en production ?**
Non. En conditions réelles, Passerelle fonctionne en permanence en arrière-plan. Les tunnels sont démarrés une fois et restent ouverts pendant des semaines ou des mois. Vous ne rencontrerez cette limite qu'en phase de développement actif, lorsque vous redémarrez le daemon ou ajoutez plusieurs services en l'espace de quelques secondes.

**Comment corriger le problème :**
Si votre adresse IP est temporairement bloquée (généralement entre 15 minutes et 1 heure), vous pouvez soit :
- **Patienter** que la restriction soit levée.
- **Changer votre adresse IP** en vous connectant à un VPN ou à un partage de connexion mobile (4G).

*(Note : Dans la future V2 avec prise en charge du BYOD, vous pourrez router un nombre illimité de services à travers un seul tunnel authentifié utilisant votre propre nom de domaine, ce qui éliminera totalement cette restriction).*
