const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Récupère le dossier passé en paramètre (ex: ./backend), sinon prend le dossier courant
const targetDir = process.argv[2] || '.';
const pkgPath = path.resolve(targetDir, 'package.json');

if (!fs.existsSync(pkgPath)) {
    console.error(`❌ Fichier package.json introuvable dans : ${pkgPath}`);
    process.exit(1);
}

// Configuration du délai de sécurité (5 jours)
const DELAY_DAYS = 5;
const CUTOFF_DATE = new Date(Date.now() - DELAY_DAYS * 24 * 60 * 60 * 1000);

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

console.log(`🔍 [${pkg.name || targetDir}] - Recherche des versions publiées AVANT le : ${CUTOFF_DATE.toISOString().split('T')[0]}\n`);

for (const [dep] of Object.entries(dependencies)) {
    try {
        const rawData = execSync(`npm view ${dep} time --json`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
        const timeData = JSON.parse(rawData);

        const safeVersions = Object.entries(timeData)
            .filter(([key]) => key !== 'created' && key !== 'modified')
            .filter(([_, timeStr]) => new Date(timeStr) <= CUTOFF_DATE)
            .map(([ver]) => ver);

        const latestSafeVersion = safeVersions[safeVersions.length - 1];

        if (latestSafeVersion) {
            console.log(`  📦 ${dep} -> Version sûre retenue : ${latestSafeVersion}`);
            // Remplacez la commande d'installation par ceci :
            // Après (Correction avec --legacy-peer-deps) :
            execSync(`npm install ${dep}@${latestSafeVersion} --save-exact --legacy-peer-deps`, {
                cwd: targetDir,
                stdio: 'inherit'
            });
        }
    } catch (err) {
        console.error(`  ⚠️ Impossible de vérifier ${dep}`);
    }
}

console.log(`\n✅ Mise à jour terminée pour ${targetDir} !`);