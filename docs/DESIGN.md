# Syntaxalade 2.1 — Atelier de phrases clair

## Références

Trois références complètes ont été générées avec l’outil Image Gen intégré :

- `concept-clair-accueil.png` : démarrage vide et première liste.
- `concept-clair-editeur.png` : saisie structurée des phrases et traductions.
- `concept-clair-jeu.png` : jeu de remise en ordre avec tuiles en relief.

Les références sont en 1536 × 1024. L’interface est entièrement native HTML/CSS/JavaScript. Les phrases, les scores et les contrôles ne font jamais partie d’une image.

## Système graphique

Fond clair `#f7f8fc`, surfaces blanches, encre `#1e2541`, accent vert `#27835b`, bordures claires et reliefs verts. Police système locale ; boutons et champs classiques. La navigation principale expose trois espaces. L’aide et les réglages sont placés en bas.

Les tuiles sont des boutons HTML dont la largeur découle du texte. Le relief est construit avec des ombres et une perspective légère. Ce choix conserve la lisibilité, le clavier, les mots longs et l’adaptation à la projection. Les animations sont courtes, désactivables et respectent la réduction des mouvements du système.

## Visuel de production

`assets/welcome.png` est une illustration transparente, générée avec l’outil Image Gen puis redimensionnée sans supprimer sa transparence. Les lettres A, B et C font partie de l’illustration ; ce ne sont pas des phrases préenregistrées.

Prompt utilisé :

> Use case stylized-concept. Standalone transparent-background illustration for a luminous white and pale lavender teacher word-workshop app. Three floating thick rounded-square clear frosted glass tiles gently overlapping diagonally from upper left to lower right, each tile contains exactly one large elegant extruded violet letter, A on top left, B middle right, C bottom left. Beautiful premium 3D product render, translucent porcelain and glass, soft lavender refracted sides, subtle pale blue edges, extremely crisp clean white fronts. Soft bright studio lighting, no black or dark areas, gentle realistic ambient shadows contained below each tile with no ground plane. Entire composition centered with generous margins and the three full tiles visible. Actual transparent alpha backdrop, no UI controls, no additional text or letters, no space or stars, no watermark. Matches an airy minimal futuristic light app with purple accent #6554d7. Do not fill the background.

L’icône `assets/icon.svg` est un élément vectoriel de l’interface. Ses variantes de packaging sont dans `build/`.

## Adaptations fonctionnelles intentionnelles

Les références de jeu utilisent une phrase hypothétique pour illustrer l’agencement. L’application distribuée est vide. Les titres, boutons et états de saisie restent cohérents avec les références. Les espacements s’adaptent à la longueur réelle des phrases et aux dimensions de l’écran. Le bouton de démarrage reste disponible dans la projection avant le début d’une partie. Les équipes sont masquées lorsqu’on joue tous ensemble.
