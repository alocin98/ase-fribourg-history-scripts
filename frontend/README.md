# Frontend ASE Project

Ce dossier contient l'interface utilisateur du projet ASE.

## Description

C'est une application web simple créée avec React, TypeScript et Vite. Elle permet :

- de se connecter
- de créer un compte
- d'accéder à la page principale
- de téléverser une image
- de prévisualiser et de télécharger le fichier sélectionné

## Technologies utilisées

- React
- TypeScript
- Vite
- React Router DOM

## Démarrer le projet

Ouvrez un terminal dans ce dossier puis exécutez :

```bash
npm install
npm run dev -- --host 0.0.0.0
```

## Vérifier le projet

Pour vérifier que le code compile correctement :

```bash
npm run build
```

## Structure principale

- src/pages : contient les pages de connexion, inscription et accueil
- src/components : contient les composants réutilisables
- src/App.tsx : gère la navigation globale
- src/App.css : contient le style principal de l'application

## Notes importantes

Ce frontend est une version simple et pédagogique du projet. Il permet de montrer la logique principale et la mise en page sans dépendre d'un backend complexe.

Le code est volontairement clair et facile à comprendre pour un débutant.
