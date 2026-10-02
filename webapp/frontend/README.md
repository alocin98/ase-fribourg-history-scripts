# Frontend ASE Project

Ce dossier contient l'interface utilisateur du projet ASE.

## Description

C'est une application web simple créée avec React, TypeScript et Vite. Pour le MVP, elle permet :

- de présenter le projet sur la page d'accueil (`/`)
- de se connecter et de créer un compte (l'application est sous `/app`)
- de voir la liste de ses documents

La lecture d'un document page par page, la création de documents, l'import d'images et la transcription ne sont pas encore développés.

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

## Déploiement avec Docker

L'image compile l'application puis la sert avec nginx (port 80).

```bash
docker build -t ase-frontend .
docker run -p 3000:80 ase-frontend
```

L'application appelle l'API sur `/api` (même domaine). Sur Coolify, le frontend et le backend partagent le même domaine : le backend reçoit le chemin `/api` (sans « strip prefix ») et le frontend le reste.

## Structure principale

- src/pages : page d'accueil (WelcomePage), connexion, inscription et liste des documents (HomePage)
- src/components : cadre de l'application, cadre des pages de connexion et sélecteur de langue
- src/api : client HTTP et appels au backend (authentification, documents)
- src/App.tsx : gère la navigation globale
- src/index.css : importe Tailwind CSS v4 et définit le thème (couleurs `paper`, `ink`, `accent`…, police) et les utilitaires partagés (`btn`, `btn-quiet`, `form-input`). Le style des composants est écrit directement avec les classes Tailwind dans le JSX.

## Notes importantes

Ce frontend est une version simple et pédagogique du projet. Il permet de montrer la logique principale et la mise en page sans dépendre d'un backend complexe.

Le code est volontairement clair et facile à comprendre pour un débutant.
