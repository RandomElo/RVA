# Sécurisation et configuration d'un VPS (SSH, UFW, Fail2Ban, Docker, SSL)

Ce README documente la procédure complète pour sécuriser un VPS neuf : authentification par clé SSH, changement de port, pare-feu UFW, protection Fail2Ban, gestion propre des permissions de fichiers, et génération d'un certificat SSL avec Certbot.

## Sommaire

1. [Préparer la clé SSH sur votre PC (Windows)](#1-préparer-la-clé-ssh-sur-votre-pc-windows)
2. [Première connexion & ajout de la clé publique sur le VPS](#2-première-connexion--ajout-de-la-clé-publique-sur-le-vps)
3. [Sécuriser SSH & pare-feu (UFW)](#3-sécuriser-ssh--pare-feu-ufw)
4. [Installer et configurer Fail2Ban](#4-installer-et-configurer-fail2ban)
5. [Gestion propre des droits de fichiers (sans 777)](#5-gestion-propre-des-droits-de-fichiers-sans-777)
6. [Génération du certificat SSL](#6-génération-du-certificat-ssl)
7. [Commandes de connexion quotidienne](#7-commandes-de-connexion-quotidienne)

---

## 1. Préparer la clé SSH sur votre PC (Windows)

Ouvrez **PowerShell** sur votre PC local.

```powershell
# 1. Créer le fichier de clé privée et coller la clé Bitwarden dedans
New-Item -Path "$HOME\.ssh\rva" -ItemType File -Force
notepad "$HOME\.ssh\rva"   # Collez la clé privée, enregistrez et fermez

# 2. Réparer les permissions Windows en une fois
$path = "$HOME\.ssh\rva"
icacls $path /c /t /inheritance:d
icacls $path /c /t /remove "NT AUTHORITY\Authenticated Users" "BUILTIN\Users" "Everyone"
icacls $path /c /t /grant:r "$($env:USERNAME):(F)"
```

## 2. Première connexion & ajout de la clé publique sur le VPS

Connectez-vous au VPS en SSH avec le mot de passe initial, puis ajoutez votre clé **publique** (celle qui commence par `ssh-rsa` ou `ssh-ed25519`) :

```bash
# Sur le VPS :
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys   # Collez votre clé PUBLIQUE ici
chmod 600 ~/.ssh/authorized_keys
```

## 3. Sécuriser SSH & pare-feu (UFW)

> ⚠️ **Ordre critique** : on configure d'abord le port SSH, puis le pare-feu, **avant** d'activer UFW.

```bash
# 1. Changer le port SSH par défaut
sudo nano /etc/ssh/sshd_config
# Modifier la ligne : Port 22 -> Port 2222
# Optionnel mais recommandé : PasswordAuthentication no (une fois la clé testée !)

# 2. Redémarrer le service SSH
sudo systemctl restart ssh
```

> ⚠️ **Ouvrez un nouveau terminal** sur votre PC pour tester la connexion sur le port 2222.
> **Ne fermez pas la session actuelle** avant d'être sûr que ça marche !

```bash
ssh -i $HOME\.ssh\rva -p 2222 debian@51.68.127.136
```

```bash
# 3. Configuration UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp   # <--- Indispensable AVANT d'activer ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable           # Répondre 'y'
```

## 4. Installer et configurer Fail2Ban

```bash
sudo apt update && sudo apt install fail2ban -y
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configurer Fail2Ban pour surveiller le bon port SSH (2222)
sudo nano /etc/fail2ban/jail.local
```

Dans `jail.local`, cherchez la section `[sshd]` et mettez à jour le port :

```ini
[sshd]
enabled = true
port = 2222
```

Activer le service :

```bash
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
sudo fail2ban-client status sshd
```

## 5. Gestion propre des droits de fichiers (sans 777)

Au lieu de donner les accès à tout le monde avec `777`, attribuez la propriété au compte `debian` (ou au groupe Docker) et utilisez des permissions sûres (`755` pour les dossiers, `644` pour les fichiers) :

```bash
# Créer les répertoires
mkdir -p ./backend/medias/newsletters
mkdir -p ./frontend/public/textes ./frontend/public/img

# Appliquer la propriété à l'utilisateur courant
sudo chown -R $USER:$USER ./frontend/public ./backend/medias

# Appliquer des permissions sécurisées
# (755 : lecture/exécution pour tous, écriture uniquement pour le propriétaire)
chmod -R 755 ./frontend/public/textes ./frontend/public/img
chmod -R 755 ./backend/medias

# Lancer le conteneur
docker compose up -d --build backend
```

## 6. Génération du certificat SSL

```bash
docker compose stop frontend
docker compose run --rm -p 80:80 --entrypoint certbot certbot certonly \
  --standalone -d rva.smce.ovh --email eloi.random@gmail.com --agree-tos --no-eff-email
docker compose start frontend
```

## 7. Commandes de connexion quotidienne

Depuis votre PC Windows, vous pouvez désormais vous connecter avec le port `2222` et vos tunnels de redirection de port :

```powershell
# Tunnel pour Doozle / Web
ssh -i $HOME\.ssh\rva -p 2222 -L 9000:localhost:8888 debian@51.68.127.136

# Tunnel pour la base de données PostgreSQL
ssh -i $HOME\.ssh\rva -p 2222 -L 5432:localhost:5432 debian@51.68.127.136
```

---

## Récapitulatif des points de vigilance

- ✅ Ne jamais activer UFW avant d'avoir ouvert le port SSH personnalisé (2222).
- ✅ Toujours tester la nouvelle connexion SSH (nouveau terminal) avant de fermer la session en cours.
- ✅ Ne désactiver `PasswordAuthentication` qu'une fois la connexion par clé validée.
- ✅ Éviter les permissions `777` : préférer `755`/`644` avec le bon propriétaire.
- ✅ Adapter le port surveillé par Fail2Ban (`2222`) pour qu'il corresponde à la config SSH.