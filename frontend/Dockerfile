# Étape 1 : Build de l'application (Vite JS compile dans /app/dist)
FROM node:20-alpine AS builder

WORKDIR /app

# Déclaration des arguments provenant de docker-compose.yml
ARG VITE_API_URL_BACKEND
ARG VITE_API_INTERNAL_URL

# Conversion des ARG en ENV pour qu'ils soient accessibles par Vite au moment du build
ENV VITE_API_URL_BACKEND=$VITE_API_URL_BACKEND
ENV VITE_API_INTERNAL_URL=$VITE_API_INTERNAL_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Étape 2 : Runtime avec Nginx + Node.js + Chromium pour prerender au démarrage
FROM nginx:alpine

# Installer Node.js et Chromium système dans Alpine
RUN apk add --no-cache nodejs npm chromium nss freetype harfbuzz ca-certificates ttf-freefont

# Indiquer à Puppeteer d'utiliser le Chromium système
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copier l'intégralité du projet (avec node_modules) pour pouvoir exécuter vite preview et prerender
COPY --from=builder /app /app

# Copier les fichiers de configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copie le build React dans le dossier web de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Exécuter le prerender, synchroniser les fichiers générés dans Nginx, puis lancer Nginx
CMD ["sh", "-c", "node scripts/prerender.mjs && cp -r /app/dist/* /usr/share/nginx/html/ && nginx -g 'daemon off;'"]