# Syntaxalade 2.1 — Atelier de phrases

Une application claire pour préparer des phrases mélangées et les projeter en classe. Fonctionne sans compte et sans connexion Internet.

## Installation

Téléchargez le fichier DMG depuis les [releases](https://github.com/CoursCircuit/Syntaxalade/releases/latest), ouvrez-le, puis glissez **Syntaxalade** dans **Applications**. L’installateur universel contient les versions Intel et Apple Silicon.

L’application est signée localement mais n’est pas notariée par Apple : macOS peut afficher un avertissement de sécurité.

### Version web

Utilisez [Syntaxalade dans votre navigateur](https://courscircuit.github.io/Syntaxalade/). Les données restent dans le stockage local de ce navigateur ; une suppression des données du navigateur peut les effacer. Exportez régulièrement une sauvegarde depuis les réglages. La version web et l’application macOS ne synchronisent pas automatiquement leurs données.

L’application démarre vide : aucune phrase, liste, classe, équipe ou dossier d’exemple. Elle ne récupère aucun contenu des anciennes éditions. Les listes et classes créées ensuite par chaque enseignant sont enregistrées sur son ordinateur.

## Première utilisation

1. Cliquez sur **Créer ma première liste**.
2. Donnez un nom à la liste. Écrivez chaque phrase dans sa case. Si vous souhaitez fournir une aide, ajoutez une traduction dans la case d’à côté. Vous pouvez ajouter ou supprimer des lignes.
3. Cliquez sur **Enregistrer la liste**. L’écran de jeu s’affiche, sans démarrer le chronomètre.
4. Laissez **Tous ensemble · sans équipes** pour commencer simplement. Choisissez un temps de réflexion, ou **Sans limite**.
5. Cliquez sur **Projeter le jeu**, puis sur **Démarrer**. Vous pouvez aussi démarrer avant de projeter.

Les élèves proposent la phrase oralement ou par écrit. Vous pouvez aussi cliquer sur les tuiles dans l’ordre pour construire la phrase. **Voir la réponse** affiche la correction à tout moment ; **Phrase suivante** continue.

La ponctuation est indépendante des mots par défaut. La correction restitue toujours la phrase originale. Une autre construction grammaticale peut être valable : l’enseignant conserve la validation pédagogique et l’attribution des points.

## Ajouter plusieurs phrases

Dans la création d’une liste, l’onglet **Coller un texte** accepte une phrase par ligne. Si vous disposez de traductions séparées, collez-les dans la zone correspondante, dans le même ordre. Une ligne de traduction peut rester vide. Cliquez sur **Ajouter ces phrases** pour vérifier le résultat dans les cases avant d’enregistrer.

Les fichiers texte `.txt` et `.tsv` peuvent être importés. Les réponses d’IA contenant des numéros de lignes, des tabulations ou le séparateur `|` sont reconnues ; il n’est pas nécessaire d’utiliser ce format quand on saisit les phrases directement.

## Demander des phrases à une IA

Choisissez **Avec une IA** dans la création d’une liste. Indiquez la matière, la langue, le thème et le niveau. Cliquez sur **Préparer et copier la consigne**, puis collez-la dans votre IA habituelle. Copiez sa réponse dans Syntaxalade et cliquez sur **Vérifier les phrases**. Vous pouvez modifier toutes les propositions avant de les enregistrer.

Aucune IA n’est connectée à l’application et aucune clé API n’est requise. Aucun thème, matière ou niveau personnel n’est prérempli.

## Classes et équipes, si vous en avez besoin

Dans **Mes classes**, cliquez sur **Créer une classe**. Ajoutez son nom et, facultativement, les prénoms. Vous pouvez ensuite :

- demander une répartition aléatoire équilibrée ;
- ajouter des équipes manuellement et saisir leurs membres dans des champs distincts ;
- demander un score par élève ;
- garder simplement une classe sans équipes.

Les noms, la composition et les scores sont mémorisés. Les groupes ne sont pas recréés au démarrage d’une partie. Les points s’ajoutent avec **+**, s’enlèvent avec **−**, et le dernier changement peut être annulé. Les scores restent cumulatifs jusqu’à leur remise à zéro.

## Retrouver et partager son travail

**Mes listes** propose les dossiers, la recherche, les favoris et des commandes explicites **Modifier** et **Jouer**. Les trois points donnent accès à la duplication, à l’export et à la suppression.

Sur macOS, les exports ouvrent la fenêtre **Enregistrer** ; dans le navigateur, ils sont téléchargés selon ses réglages. Pour partager une seule liste, choisissez **Exporter les phrases** et envoyez le fichier à votre collègue. Il pourra l’importer puis l’enregistrer. Pour transférer toutes vos listes et classes, utilisez **Réglages → Enregistrer une copie**, puis **Ouvrir une sauvegarde** sur l’autre ordinateur. Une restauration remplace les contenus actuels après confirmation ; ce n’est jamais une récupération automatique.

La partie en cours est retrouvée en pause à la réouverture. Ouvrir un dialogue, changer d’espace ou masquer l’application met le chronomètre en pause. Les parties terminées apparaissent dans Réglages ; l’historique conserve les 30 dernières parties et les totaux des équipes à leur clôture.

## Commandes utiles

| Commande | Action |
| --- | --- |
| Espace | Pause ou reprise |
| R | Voir la réponse |
| N | Phrase suivante, après correction |
| F | Entrer ou sortir de la projection |
| Échap | Quitter la projection ou fermer un dialogue |

Les raccourcis du jeu sont désactivés pendant la saisie. Les boutons s’utilisent avec la souris ou avec Tab puis Entrée. Une page **Aide**, intégrée à l’application, reprend les étapes et les questions fréquentes.

Les réglages permettent d’agrandir les mots, de modifier l’ordre des phrases, de choisir la ponctuation, de montrer une traduction dès le début, de couper les animations ou d’activer un son à la fin du temps.

## Développement

```sh
npm install
npm start
npm test
npm run test:ui
npm run test:electron
npm run dist:mac
SYNTAXALADE_PACKAGED=1 npm run test:electron
```

Les tests utilisent exclusivement des profils temporaires. Les contenus dans `tests/fixtures.cjs` ne sont jamais inclus dans l’application distribuée. L’interface est testée avec Chrome ; `PLAYWRIGHT_CHROME_EXECUTABLE` permet de sélectionner un autre exécutable Chromium.

Les tests d’interface utilisent Playwright, le plugin Browser n’étant pas disponible dans cette session. Le rendu a été comparé aux références en 1536 × 1024, puis contrôlé aux dimensions 1920 × 1080, 1280 × 800, 1024 × 768 et 390 × 844.

Le dossier de données de cette édition est `~/Library/Application Support/Syntaxalade`, avec une nouvelle clé de stockage indépendante de l’ancienne édition. Aucun ancien profil n’est lu ou modifié. `SYNTAXALADE_USER_DATA` permet de choisir un profil de test.

La compilation universelle se fait dans un dossier temporaire hors synchronisation Finder. Le bundle signé reste dans le DMG ; cela évite de lui réattacher les métadonnées des dossiers synchronisés. `SYNTAXALADE_ARCH=arm64` ou `SYNTAXALADE_ARCH=x64` permet de construire une architecture séparée si nécessaire.

Le paquet actuel est signé localement, mais ne dispose pas d’une signature Apple Developer ID ni d’une notarisation Apple. Ces deux étapes restent à prévoir pour une diffusion aux collègues sans les avertissements de sécurité macOS. Les tests sur ce Mac vérifient le lancement Apple Silicon et la présence des deux architectures dans l’application universelle ; ils ne remplacent pas un essai sur un Mac Intel réel.

Les références graphiques se trouvent dans `docs/DESIGN.md`. 

## Licence

Code distribué sous [licence MIT](LICENSE).
