# Frontend — Manuscript AI

Interface du projet ASE, dans `webapp/frontend`. Le site se lance ici. Il n’y a pas de dossier `frontend` à la racine du dépôt.

React, TypeScript, Vite et Tailwind CSS v4. La navigation utilise React Router. Les textes de toutes les pages passent par i18next (anglais par défaut, français disponible).

## Pages

| Adresse     | Fichier                      | Rôle                                                                                              |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `/`         | `src/pages/WelcomePage.tsx`  | Accueil : présentation, hero avec le manuscrit de 1464, cartes, étapes, bandeau et retour en haut |
| `/login`    | `src/pages/LoginPage.tsx`    | Connexion avec l’email et le mot de passe                                                         |
| `/register` | `src/pages/RegisterPage.tsx` | Création du compte : nom et email sur une ligne, les deux mots de passe sur la suivante           |
| `/app`      | `src/pages/AccountPage.tsx`  | Page du compte. Un court texte indique que la lecture et la transcription sont encore en cours    |

Une adresse inconnue renvoie vers `/`. Sans session, `/app` renvoie vers `/login`. Une session déjà ouverte renvoie `/login` et `/register` vers `/app`. La déconnexion est visible et ramène à l’accueil.

Entre `/login` et `/register`, la carte glisse (vers la droite pour l’inscription, vers la gauche pour revenir).

## Session

L’authentification est celle du backend : cookie HTTP-only `ase_session`, et jeton CSRF `ase_csrf` envoyé dans l’en-tête `X-CSRF-Token`. Le frontend n’enregistre ni JWT ni session dans `localStorage`. Seule la langue choisie y est gardée, sous la clé `ase_lang`.

En développement, Vite proxyfie `/api` vers `http://127.0.0.1:8000`.

## Organisation des fichiers

```
src/
  main.tsx                 point d'entrée
  App.tsx                  routes et garde des pages
  index.css                Tailwind, police, couleurs, animations
  api/
    client.ts              requêtes, cookie de session, CSRF
    auth.ts                connexion, inscription, déconnexion, utilisateur courant
  auth/
    AuthProvider.tsx       état de session pour toute l'application
  components/
    Brand.tsx              logo
    LanguageSwitcher.tsx   FR / EN
  i18n/                    textes FR et EN de toutes les pages
  pages/                   les quatre pages, plus le glissement login ↔ inscription
  assets/
    gillion-de-trazegnies-1464.jpg
public/
  favicon.svg
```

La police de l’interface est Segoe UI, avec Trebuchet MS en repli. Le dégradé du site va du bleu `#2563eb` au violet `#7c3aed`. Les boutons des formulaires partent du violet intermédiaire `#514fec`.

## Démarrer

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Le backend doit répondre sur le port 8000, sinon la connexion affiche que le serveur est injoignable.

```bash
npm run build
```

## Docker

L’image compile l’application puis la sert avec nginx (port 80).

```bash
docker build -t ase-frontend .
docker run -p 3000:80 ase-frontend
```

L’application appelle l’API sur `/api`, sur le même domaine.
