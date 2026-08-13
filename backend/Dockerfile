FROM node:22-alpine

# 1. Installer Chromium et les polices de caractères nécessaires
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# 2. Indiquer à Puppeteer de NE PAS télécharger son propre Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8100

USER node
CMD ["sh", "-c", "node bdd/initialisation.js && node serveur.js"]