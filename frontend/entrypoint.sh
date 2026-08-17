#!/bin/sh

CERT_DIR="/etc/letsencrypt/live/rva.smce.ovh"
TEMP_DIR="/tmp/ssl-temp"
FULLCHAIN="$CERT_DIR/fullchain.pem"
TEMPORARY_SSL=false

# 1. Génération du certificat temporaire dans un dossier à part
if [ ! -f "$FULLCHAIN" ]; then
  echo "--> Aucun certificat SSL trouvé. Création d'un certificat temporaire auto-signé..."
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

# 4. Obtention du vrai certificat
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
    --agree-tos --no-eff-email --non-interactive \
    --force-renewal; then
    
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