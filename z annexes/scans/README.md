# Update les paquets
``` sh
npx npm-check-updates -u [filtre]   # (Modifie le package.json)
npm install                         # (Regénère le package-lock.json)
npm run dev / npm test              # (Vérification locale)
git commit -m "chore: update deps"  # (Sauvegarde le point de restauration)
```


## Warning à cause des packages avec script d'installation natif (bcrypt, puppeteer, ..;)

Des messages comme cela peuvent apparaitre

```
2 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
npm warn allow-scripts 2 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   bcrypt@6.0.0 (install: node-gyp rebuild)
npm warn allow-scripts   puppeteer@25.5.0 (postinstall: node install.mjs)
npm warn allow-scripts
npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.

```

Alors il faut :

- aller dans le bon dossier
- Lister les packages qui demande une autorisation spéciale : `npm approve-scripts --allow-scripts-pending`
- Les autoriser `npm approve-scripts bcrypt` (remplacer `bcrypt` par le nom du package)

# Scripts de scan `npm` et `CVE`

## Installer Trivy

```shell
sudo apt-get install -y wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt-get update && sudo apt-get install -y trivy jq curl
```
## Crée un fichier `.env`
``` bash
nano rva-scan/.env
DISCORD_WEBHOOK_URL=URL_WEBHOOK # dans le .env
chmod 600 rva-scan/.env
```
## Étabilissement des cron
``` bash
crontab -e # 1 (nano)
0 8 * * * /bin/bash /home/eloi/bots/rva-scan/scripts/scan-cve.sh >> /home/eloi/bots/rva-scan/scripts/cve.log 2>&1
0 8 * * * /bin/bash /home/eloi/bots/rva-scan/scripts/scan-npm.sh >> /home/eloi/bots/rva-scan/scripts/npm.log 2>&1
```