# FROM node:20-alpine

# RUN apk add --no-cache dcron bash curl

# WORKDIR /app
# COPY package*.json ./
# RUN npm install --production
# COPY . .

# COPY crontab /etc/crontabs/root
# RUN chmod 0600 /etc/crontabs/root && mkdir -p /app/data

# CMD ["crond", "-f", "-l", "2"]

FROM node:20-alpine

RUN apk add --no-cache dcron bash curl

WORKDIR /app
COPY . .

COPY crontab /etc/crontabs/root
RUN chmod 0600 /etc/crontabs/root && mkdir -p /app/data

# On rend le script d'entrée exécutable et on le lance au démarrage
RUN chmod +x /app/entrypoint.sh
CMD ["/app/entrypoint.sh"]