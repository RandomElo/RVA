# Étape 1 : Build de l'application (Vite JS compile dans /app/dist)
FROM node:20-alpine AS builder

WORKDIR /app

# Déclaration des arguments provenant de docker-compose.yml
ARG VITE_API_URL_BACKEND
ARG VITE_API_INTERNAL_URL

# Conversion des ARG en ENV pour qu'ils soient accessibles par Vite
ENV VITE_API_URL_BACKEND=$VITE_API_URL_BACKEND
ENV VITE_API_INTERNAL_URL=$VITE_API_INTERNAL_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# Étape 2 : Runtime Nginx + Node.js + Chromium + Certbot
FROM nginx:alpine

# Installation des dépendances système :
# - Node/Chromium pour le prerender avec Puppeteer
# - Certbot/OpenSSL pour la gestion autonome des certificats HTTPS
RUN apk add --no-cache \
    nginx-mod-http-brotli \
    nodejs \
    npm \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    certbot \
    openssl

# Configuration Puppeteer pour Chromium Alpine
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copie du projet compilé et des fichiers de configuration
COPY --from=builder /app /app
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Intégration du script d'entrée autonome
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

CMD ["/entrypoint.sh"]