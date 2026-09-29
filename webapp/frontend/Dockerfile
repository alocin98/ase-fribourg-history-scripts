# Étape 1 : compilation de l'application avec Node.
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Étape 2 : service des fichiers statiques avec nginx.
# Les appels /api sont routés vers le backend par Coolify (même domaine).
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
