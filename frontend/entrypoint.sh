#!/bin/sh
set -e

CERT_DIR="/etc/letsencrypt/live/rva.smce.ovh"
TEMP_DIR="/tmp/ssl-temp"
FULLCHAIN="$CERT_DIR/fullchain.pem"
TEMPORARY_SSL=false

# Vérifie si un certificat Let's Encrypt valide (pas auto-signé, pas bientôt expiré) est déjà présent
cert_is_valid_letsencrypt() {
  [ -f "$FULLCHAIN" ] || return 1
  # doit encore être valide au moins 30 jours (2592000s)
  openssl x509 -checkend 2592000 -noout -in "$FULLCHAIN" >/dev/null 2>&1 || return 1
  # ne doit pas être auto-signé (issuer == subject sur un self-signed)
  issuer=$(openssl x509 -noout -issuer -in "$FULLCHAIN" 2>/dev/null)
  subject=$(openssl x509 -noout -subject -in "$FULLCHAIN" 2>/dev/null)
  [ -n "$issuer" ] && [ "$issuer" != "$subject" ]
}

# 1. Génération du certificat temporaire uniquement si aucun certificat valide n'existe
if cert_is_valid_letsencrypt; then
  echo "--> Certificat Let's Encrypt valide trouvé. Aucune action nécessaire."
else
  echo "--> Aucun certificat SSL valide trouvé. Création d'un certificat temporaire auto-signé..."
  mkdir -p "$TEMP_DIR" "$CERT_DIR"

  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$TEMP_DIR/privkey.pem" \
    -out "$TEMP_DIR/fullchain.pem" \
    -subj "/CN=rva.smce.ovh"

  # Copie temporaire dans le vrai dossier
  cp "$TEMP_DIR/privkey.pem" "$CERT_DIR/privkey.pem"
  cp "$TEMP_DIR/fullchain.pem" "$CERT_DIR/fullchain.pem"

  TEMPORARY_SSL=true
fi

# 2. Prerender
echo "--> Lancement du prerender..."
node scripts/prerender.mjs && cp -r /app/dist/* /usr/share/nginx/html/

# 3. Démarrage Nginx
echo "--> Démarrage de Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# 4. Obtention du vrai certificat, uniquement si on tourne encore sur le temporaire
if [ "$TEMPORARY_SSL" = true ]; then
  echo "--> Attente de l'initialisation de Nginx..."
  sleep 2

  echo "--> Demande du vrai certificat Let's Encrypt via Certbot..."

  # Nettoyage du dossier temporaire pour laisser Certbot créer les liens symboliques proprement
  rm -rf "$CERT_DIR"

  if certbot certonly --webroot -w /var/www/certbot \
    -d rva.smce.ovh \
    --cert-name rva.smce.ovh \
    --email eloi.random@gmail.com \
    --agree-tos --no-eff-email --non-interactive; then

    echo "--> Certificat obtenu avec succès ! Rechargement de Nginx..."
    nginx -s reload
  else
    echo "--> Attention : Échec Certbot. Restauration du certificat temporaire."
    mkdir -p "$CERT_DIR"
    cp "$TEMP_DIR/privkey.pem" "$CERT_DIR/privkey.pem"
    cp "$TEMP_DIR/fullchain.pem" "$CERT_DIR/fullchain.pem"
  fi
fi

# 5. Maintien du conteneur
wait $NGINX_PID