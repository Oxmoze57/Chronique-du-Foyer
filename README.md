# Chroniques du Foyer — v6.8.1 GitHub Pages Fix

Version corrigée pour un déploiement GitHub Pages dans un dépôt de projet (`https://pseudo.github.io/chroniques-du-foyer/`).

## Installation GitHub Pages

1. Décompresser le ZIP sur l’ordinateur.
2. Ouvrir le dépôt GitHub.
3. Supprimer/remplacer les anciens fichiers de l’application.
4. Envoyer **les fichiers décompressés**, pas le fichier ZIP lui-même. `index.html` doit être visible directement à la racine du dépôt.
5. `Settings` → `Pages` → `Deploy from a branch`.
6. Branche `main`, dossier `/ (root)`, puis `Save`.
7. Attendre que GitHub indique que le site est publié, puis ouvrir l’URL fournie.
8. Si une ancienne PWA était déjà installée, fermer complètement l’application puis la rouvrir. En cas de cache persistant, supprimer l’ancienne PWA de l’écran d’accueil puis la réinstaller depuis l’URL GitHub Pages.

## Correctifs GitHub Pages

- chemins relatifs explicites pour les assets et le manifeste ;
- `start_url`, `id` et `scope` compatibles avec un dépôt de projet ;
- service worker durci : il ne renvoie plus `index.html` à la place d’une image/JS/JSON manquant ;
- cache versionné `chroniques-v6.8.1-github-fixed` ;
- chargement de la bibliothèque ménagère basé sur `document.baseURI` ;
- enregistrement du service worker basé sur `document.baseURI` ;
- `.nojekyll` conservé.

Les données utilisateur restent dans `localStorage` et la clé existante n’est pas modifiée.
