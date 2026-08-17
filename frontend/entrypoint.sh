#!/bin/sh

CERT_DIR="/etc/letsencrypt/live/rva.smce.ovh"
FULLCHAIN="$CERT_DIR/fullchain.pem"
TEMPORARY_SSL=false

# 1. Génération d'un certificat temporaire si le SSL Let's Encrypt est absent
if [ ! -f "$FULLCHAIN" ]; then
  echo "--> Aucun certificat SSL trouvé. Création d'un certificat temporaire auto-signé..."
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$FULLCHAIN" \
    -subj "/CN=rva.smce.ovh"
  TEMPORARY_SSL=true
fi

# 2. Exécution du Prerender et mise à jour du dossier web
echo "--> Lancement du prerender..."
node scripts/prerender.mjs && cp -r /app/dist/* /usr/share/nginx/html/

# 3. Démarrage de Nginx en tâche de fond (processus principal)
echo "--> Démarrage de Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# 4. Si le certificat était temporaire, demande du vrai certificat via Webroot
if [ "$TEMPORARY_SSL" = true ]; then
  echo "--> Attente de l'initialisation de Nginx..."
  sleep 2

  echo "--> Demande du vrai certificat Let's Encrypt via Certbot..."
  
  # Suppression de -d www.rva.smce.ovh + capture de la réussite
  if certbot certonly --webroot -w /var/www/certbot \
    -d rva.smce.ovh \
    --email eloi.random@gmail.com \
    --agree-tos --no-eff-email --non-interactive; then
    
    echo "--> Certificat obtenu avec succès ! Rechargement de Nginx..."
    nginx -s reload
  else
    echo "--> Attention : Échec Certbot. Le site reste sur le certificat temporaire."
  fi
fi

# 5. Maintien du conteneur en attente du processus Nginx
wait $NGINX_PID