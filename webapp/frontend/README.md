# Frontend — Manuscript AI

ASE project UI, in `webapp/frontend`. The app is started from here. There is no `frontend` folder at the repository root.

Stack: React, TypeScript, Vite, and Tailwind CSS v4. Routing uses React Router. All page copy goes through i18next (English by default, French available).

## Pages

- `/` — `WelcomePage.tsx`: landing page
- `/login` — `auth/LoginPage.tsx`: sign in
- `/register` — `auth/RegisterPage.tsx`: create an account
- `/app/documents` — `Dashboard/DocumentsPage.tsx`: my documents and **Shared with me**
- `/app/documents/:id/overview` — `Dashboard/DocumentOverviewPage.tsx`: images (IIIF), transcription, export, sharing

Unknown routes redirect to `/`. Without a session, `/app/*` redirects to `/login`. With an open session, `/login` and `/register` redirect to `/app/documents`.

The signed-in shell (`DocumentsFrame`) shows the logo, transcription search, **My documents**, language switcher, and sign out. There is no sidebar and no profile page.

## Recent frontend features

Frontend-only work (no backend changes) on branch `export-and-share-document-frontend`.

### PDF export

- Icon button on the document page (instant tooltip)
- Expected call: `GET /api/documents/{id}/export` to download the PDF
- States: loading, error, disabled when there are no images

### Document sharing

- Owner only: share icon and dialog (username, viewer or editor role)
- Access list: change role or remove access
- **Shared with me** section on `/app/documents`
- UI permissions:
  - **viewer**: read only (no upload, no transcription)
  - **editor**: upload and transcription
  - **owner**: everything, plus sharing and deletion
- Expected routes:
  - `GET /api/documents/shared`
  - `GET` / `POST /api/documents/{id}/shares`
  - `PATCH` / `DELETE /api/documents/{id}/shares/{shareId}`

### Transcription search

- Centered search field in the navigation bar
- Results: document, page, line, with the match highlighted
- Click opens `/app/documents/{id}/overview?page=...&line=...` and highlights the line (text and image)
- Expected route: `GET /api/transcriptions/search?q=...`

### IIIF display

- OpenSeadragon viewer on the document page
- Tiles go through the same origin (`/api`) so the session cookie is sent (avoids 401 locally through the Vite proxy)

## Session

Auth matches the backend: HTTP-only `ase_session` cookie, and CSRF token `ase_csrf` sent in the `X-CSRF-Token` header. The frontend stores neither JWT nor session in `localStorage`. Only the chosen language is kept there, under `ase_lang`.

In development, Vite proxies `/api` to `http://127.0.0.1:8000` (with `changeOrigin` and `xfwd` for proxy headers).

## File layout

```
src/
  main.tsx
  App.tsx
  index.css
  api/
    client.ts
    auth.ts
    documents.ts
    transcription.ts
  auth/
    AuthProvider.tsx
  components/
    Brand.tsx
    LanguageSwitcher.tsx
    ConfirmDialog.tsx
  i18n/
  pages/
    WelcomePage.tsx
    auth/
    Dashboard/
      DocumentsFrame.tsx
      DocumentsPage.tsx
      DocumentOverviewPage.tsx
      PageImage.tsx
      ShareDialog.tsx
      TranscriptionSearch.tsx
```

## Getting started

```bash
npm install
npm run dev
```

The app is served at [http://localhost:5173/](http://localhost:5173/). The backend must answer on port 8000 (`webapp/backend` via Docker Compose), otherwise API calls fail.

```bash
npm run typecheck
npm run build
```

## Docker

The image builds the app and serves it with nginx (port 80).

```bash
docker build -t ase-frontend .
docker run -p 3000:80 ase-frontend
```

The app calls the API on `/api`, on the same domain.
