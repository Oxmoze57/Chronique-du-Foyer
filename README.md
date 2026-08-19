# Chroniques du Foyer — v6.6 Mythic Shōnen Edition

Interface renforcée avec une direction shōnen mythologique originale, tout en conservant la logique et les données de la v6.4.

# Chroniques du Foyer — v6.4 Shōnen Home Edition

140 missions adaptées à 8 zones du logement, écran de victoire shōnen, fonctionnement hors ligne conservé.

# Chroniques du Foyer

Application PWA personnelle, centrée sur le foyer et conçue pour transformer les tâches quotidiennes en missions motivantes.

## Fonctionnalités incluses

- Missions ponctuelles et routines du foyer
- Serment du jour avec jusqu'à 3 missions prioritaires
- Rituel du soir pour préparer le lendemain
- Mode 5 minutes / reprise anti-procrastination
- Missions ménagères surprises issues d'une bibliothèque structurée
- Catégories : Entretien, Cuisine, Rangement, Soutien, Artisanat, Administratif
- XP, niveaux, rangs, vertus, éclats et badges
- Campagnes pour les gros projets et leurs étapes
- Minuteur de mission
- Export / import JSON des données
- Installation PWA et fonctionnement hors ligne
- Test de notifications locales lorsque l'application est active

## Structure

- `index.html` — interface principale
- `style.css` — identité visuelle
- `app.js` — logique de l'application
- `household-library.js` — moteur de sélection des tâches ménagères
- `household-task-library.v1.json` — bibliothèque ménagère versionnée
- `manifest.webmanifest` — manifeste PWA
- `sw.js` — service worker / cache hors ligne
- `icon.svg`, `icon-192.png`, `icon-512.png` — icônes
- `.nojekyll` — désactive le traitement Jekyll de GitHub Pages
- `VERSION.txt` — version du paquet

## Publication sur GitHub Pages

1. Créer un dépôt GitHub, par exemple `chroniques-du-foyer`.
2. Décompresser cette archive.
3. Envoyer **le contenu du dossier** à la racine du dépôt, de sorte que `index.html` soit à la racine.
4. Dans GitHub : `Settings` → `Pages`.
5. Choisir le déploiement depuis une branche, puis la branche `main` et le dossier `/ (root)`.
6. Ouvrir l'adresse GitHub Pages fournie par GitHub.
7. Sur téléphone, ajouter le site à l'écran d'accueil pour l'utiliser comme une application.

Tous les chemins de l'application sont relatifs afin qu'elle fonctionne dans un dépôt de projet du type `https://pseudo.github.io/chroniques-du-foyer/`.

## Données et sauvegardes

Les données sont stockées localement dans le navigateur du téléphone. Utiliser régulièrement l'export JSON intégré pour conserver une sauvegarde indépendante de l'appareil.

Le schéma de données est actuellement `6`. Les futures versions doivent migrer les anciennes données plutôt que les écraser.

## Bibliothèque ménagère

La bibliothèque est indépendante de l'état utilisateur et peut évoluer par version. Le moteur filtre les propositions selon la durée, la difficulté, les conditions et le risque. Les suggestions automatiques restent limitées par défaut aux tâches à risque faible.

## Notifications

La version statique peut demander l'autorisation et effectuer des tests locaux. Les notifications fiables à heure fixe lorsque l'application est totalement fermée nécessiteront ultérieurement un service de push côté serveur ; aucune clé privée ne doit être intégrée au dépôt public.

## Avant une mise à jour

Toujours exporter les données depuis l'application avant de remplacer une version importante. Ne pas changer les identifiants permanents des tâches de la bibliothèque sans stratégie de migration.


## v6.6 — Serment du Royaume
Le sélecteur de Serment peut désormais ajouter jusqu’à trois idées ménagères sûres issues de la bibliothèque du foyer. Les suggestions respectent le risque maximal, la durée, la difficulté, le logement configuré et évitent de dupliquer une mission ménagère déjà active.
