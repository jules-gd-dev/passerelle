```text
██████╗  █████╗ ███████╗███████╗███████╗██████╗ ███████╗██╗     ██╗     ███████╗
██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝██║     ██║     ██╔════╝
██████╔╝███████║███████╗███████╗█████╗  ██████╔╝█████╗  ██║     ██║     █████╗  
██╔═══╝ ██╔══██║╚════██║╚════██║██╔══╝  ██╔══██╗██╔══╝  ██║     ██║     ██╔══╝  
██║     ██║  ██║███████║███████║███████╗██║  ██║███████╗███████╗███████╗███████╗
╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝
```

[English](README.md) | [Français](README_fr.md) | [中文](README_zh.md)

# Passerelle - Client & Démon

Passerelle est un démon open-source de tunnelage sécurisé et de découverte automatique de services locaux, conçu pour les développeurs. Il crée des ponts distants instantanés et sans configuration vers vos serveurs de développement locaux tout en conservant le contrôle strict de l'authentification sur votre machine.

---

## Pourquoi un client open-source garantit votre sécurité

L'ouverture du code source de Passerelle apporte une transparence algorithmique absolue et une confiance totale pour les utilisateurs :
* **Authentification locale Zero-Knowledge** : Votre code PIN est généré et vérifié sur votre machine locale. Le Gateway externe agit exclusivement comme un relais WebSocket en aveugle et non de confiance. Si une tentative présente un PIN invalide, le démon local la rejette instantanément.
* **Absence totale de Backdoors ou de Terminal Distant** : Vous pouvez vérifier que le démon ne transfère des requêtes qu'en direction des ports HTTP de développement locaux découverts. Aucune fonction d'exécution de commande shell ni d'exploration de fichiers n'est présente.
* **Télémétrie et Souveraineté Transparente** : Les métadonnées se limitent aux signaux de vie (pings) et au résumé brut des services. Vous pouvez basculer librement sur une instance privée à tout moment.

---

## Démarrage Rapide & Interface de Gestion (`passerelle ui`)

### 1. Installation & Démarrage
```bash
npm install -g @julesgd/passerelle
passerelle setup
```

### 2. Console de gestion interactive en temps réel
Pour administrer activement votre démon, surveiller les tunnels et piloter vos sessions en direct, connectez-vous à l'interface interactive :
```bash
passerelle ui
```
Une fois attaché au terminal, vous pouvez exécuter des actions instantanées via des raccourcis clavier :
* `[r]` **Renouveler le PIN** : Génère immédiatement un nouveau code PIN et révoque l'accès des sessions existantes.
* `[s]` **Copier le lien** : Copie l'URL de connexion web directe dans votre presse-papiers.
* `[c]` / `[l]` **Statut & Services** : Inspecte le nombre de connexions actives et la liste des serveurs HTTP de développement détectés.
* `[h]` **Mode Confidentialité (Privacy)** : Masque le QR code et le code PIN de l'écran lors de partages d'écran en réunion.
* `[k]` **Tuer les sessions** : Coupe instantanément toutes les sessions clientes distantes actives.
* `[p]` **Re-déclarer à la Gateway** : Synchronise et renvoie immédiatement le signal de présence à la Gateway (ou via CLI : `passerelle register`).
* `[d]` **Détacher** : Quitte la console interactive en laissant le service PM2 tourner en tâche de fond.

---

## Référence des commandes CLI

| Commande | Arguments | Description |
| :--- | :--- | :--- |
| `setup / start` | Aucun | Installe et démarre le démon en tâche de fond via PM2 |
| `stop / restart` | Aucun | Arrête ou redémarre le service de fond persistant |
| `status / json` | Aucun | Affiche un résumé du statut ou l'état complet au format brut JSON |
| `link / qr` | Aucun | Renvoie l'URL de connexion directe ou génère le QR Code en terminal |
| `register / sync` | Aucun | Re-déclare et synchronise la présence du démon directement avec la Gateway |
| `config` | `<key> <val>` | Affiche ou modifie la configuration locale (`gateway_url`, `machine_id`...) |
| `credits` | Aucun | Affiche les crédits du projet, l'auteur, le dépôt github et les donations |
| `ui / attach` | Aucun | Ouvre le tableau de bord interactif en direct dans le terminal |
| `logs / help` | Aucun | Affiche le flux de journaux en temps réel ou la liste des commandes |

---

## Foire Aux Questions (FAQ) & Dépannage

* **Mon lien de connexion m'affiche une "Erreur de tunnel" ou est inaccessible ?**
  -> C'est normal après une période d'inactivité ou une bascule réseau ! L'URL de votre tunnel Cloudflare a probablement expiré et été renouvelée par le démon. Il vous suffit de recliquer sur votre lien depuis le tableau de bord Gateway (`passerelle-cloud.julesgd.dev`) ou de lancer `passerelle link` pour obtenir la nouvelle adresse en direct.
* **La Gateway indique que mon démon est inaccessible ou hors ligne ?**
  -> Vérifiez d'abord que votre démon local est bien démarré avec `passerelle status`. S'il tourne correctement, tentez de le re-déclarer à la Gateway instantanément avec la commande `passerelle register` (ou en pressant `[p]` dans `passerelle ui`).
* **Comment couper immédiatement un accès ou révoquer une session tierce ?**
  -> Ouvrez `passerelle ui` et appuyez sur `[k]` pour tuer toutes les sessions actives en cours, ou sur `[r]` pour régénérer un nouveau code PIN, fermant immédiatement les accès distants précédemment authentifiés.
* **Comment ajouter ou configurer mes propres services locaux et applications ?**
  -> Passerelle gère vos applications et serveurs de développement à partir de votre fichier local `services.json` (supportant l'exécution de commandes `cli`, les conteneurs `docker` et les ports de redirection `network`). Il vous suffit d'éditer ce fichier ou de déclarer vos services directement via votre interface web Gateway pour pouvoir les piloter et les exposer dans le tunnel !
* **Puis-je masquer mon PIN et QR code pendant un appel visio ou en espace partagé ?**
  -> Oui ! Lorsque vous êtes connecté à `passerelle ui`, pressez la touche `[h]` pour activer le Mode Confidentialité. Vos informations sensibles seront immédiatement masquées à l'écran.
* **Comment rediriger mon trafic vers ma propre instance Gateway d'entreprise ?**
  -> Lancez `passerelle config gateway_url https://ma-passerelle.entreprise.com` puis redémarrez avec `passerelle restart`. (*Remarque : Le code source de la Gateway relais sera très bientôt publié en open-source pour faciliter votre auto-hébergement !*)
* **Que se passe-t-il si je redémarre mon ordinateur ?**
  -> Grâce à l'architecture PM2 intégrée, vous pouvez restaurer instantanément votre tunnelier en arrière-plan à tout moment après un redémarrage en tapant simplement `passerelle setup`.

---

## Crédits du Projet & Remerciements
* **Auteur** : Jules GD (julesgd.dev) | **GitHub** : [jules-gd-dev/paserelle-deamon](https://github.com/jules-gd-dev/paserelle-deamon) | **Sponsors** : [Soutenir sur GitHub](https://github.com/sponsors/jules-gd-dev) | **Licence** : MIT
