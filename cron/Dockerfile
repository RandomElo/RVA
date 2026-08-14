FROM node:20-alpine

RUN apk add --no-cache dcron bash curl

WORKDIR /app
COPY . .

COPY crontab /etc/crontabs/root
RUN chmod 0600 /etc/crontabs/root && mkdir -p /app/data

CMD ["crond", "-f", "-l", "2"]