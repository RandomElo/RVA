// scripts/prerender.mjs
//
// À exécuter APRÈS "vite build" (voir le script "postbuild" dans package.json).
// Lance un serveur "vite preview" temporaire, ouvre chaque route avec Puppeteer,
// récupère le HTML final rendu par React, et l'écrit dans dist/<route>/index.html
// (dist/index.html pour la route "/").

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");

// Charge les variables .env depuis la racine du projet
const env = loadEnv(process.env.NODE_ENV || "production", root, "");

const PORT = env.VITE_PRERENDER_PORT || process.env.VITE_PRERENDER_PORT;
const INTERNAL_SECRET = env.INTERNAL_SECRET || process.env.INTERNAL_SECRET;

// Garde cette liste synchronisée avec les routes de ton app
const routes = [
    "/",
    "/notre-histoire",
    "/contactez-nous",
    "/nos-partenaires",
    "/calendrier",
    "/blog",
    "/ressources",
    "/ressources/plan-entrainement",
    "/ressources/tests-vma",
    "/ressources/vma",
    "/ressources/lexique",
    "/mentions-legales",
    "/politique-confidentialite",
    "/cgu",
    "/credits",
];

const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

function pingOnce(url) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            res.resume(); // vide la réponse pour libérer le socket
            resolve(res.statusCode < 500);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

function waitForServer(url, timeoutMs = 30000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const attempt = async () => {
            const ok = await pingOnce(url);
            if (ok) return resolve();
            if (Date.now() - start > timeoutMs) {
                return reject(new Error(`Le serveur preview n'a pas démarré à temps (${url})`));
            }
            setTimeout(attempt, 300);
        };
        attempt();
    });
}

async function main() {
    // Permet de désactiver le prerender via variable d'environnement si nécessaire
    if (process.env.SKIP_PRERENDER === "true") {
        console.log("→ SKIP_PRERENDER=true détecté. Prerendering ignoré.");
        return;
    }

    // Utiliser l'exécutable Vite local situé dans node_modules
    const viteBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");

    console.log(`→ Node ${process.version} détecté.`);
    console.log(`→ Démarrage de \`vite preview\` sur ${BASE_URL}...`);

    const previewProcess = spawn(
        viteBin,
        ["preview", "--host", HOST, "--port", String(PORT), "--strictPort"],
        { cwd: root, stdio: "pipe" }
    );

    let previewOutput = "";
    let previewExited = false;
    let previewExitCode = null;

    previewProcess.stdout.on("data", (d) => {
        previewOutput += d.toString();
        process.stdout.write(`[preview] ${d}`);
    });
    previewProcess.stderr.on("data", (d) => {
        previewOutput += d.toString();
        process.stderr.write(`[preview] ${d}`);
    });
    previewProcess.on("error", (err) => {
        previewOutput += `\n[spawn error] ${err.message}\n`;
        console.error("✗ Impossible de lancer `vite preview` :", err.message);
    });
    previewProcess.on("exit", (code) => {
        previewExited = true;
        previewExitCode = code;
    });

    let browser;
    try {
        await waitForServer(BASE_URL);
        if (previewExited) {
            throw new Error(
                `\`vite preview\` s'est arrêté prématurément (code ${previewExitCode}).\n--- Sortie ---\n${previewOutput}`
            );
        }
        console.log("→ Serveur preview prêt. Lancement de Puppeteer...");

        // Configuration adaptée pour Docker / Alpine / Linux root
        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        });
        const page = await browser.newPage();

        // Injecte le header secret pour contourner le rate limiter du backend
        if (INTERNAL_SECRET) {
            console.log("→ Injection du header x-internal-secret pour Puppeteer.");
            await page.setExtraHTTPHeaders({
                "x-internal-secret": INTERNAL_SECRET,
            });
        } else {
            console.warn("⚠️  INTERNAL_API_SECRET est absent du .env. Les requêtes réseau peuvent être rate-limited.");
        }

        for (const route of routes) {
            const url = `${BASE_URL}${route}`;
            process.stdout.write(`  · ${route} ... `);

            await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

            // 1. Utiliser `let` au lieu de `const` pour pouvoir modifier le contenu
            let html = await page.content();

            // 2. Nettoyage des URLs absolues locales (127.0.0.1 ou localhost)
            const localUrlRegex = new RegExp(`http://(?:127\\.0\\.0\\.1|${HOST}):\\d+`, "g");
            html = html.replace(localUrlRegex, "");

            // 3. Écriture du fichier HTML
            const outDir = route === "/" ? distDir : path.join(distDir, route.replace(/^\//, ""));
            await mkdir(outDir, { recursive: true });
            await writeFile(path.join(outDir, "index.html"), html, "utf-8");

            console.log("ok");
        }

        console.log("✓ Prerendering terminé avec succès.");
    } catch (err) {
        console.error("✗ Échec du prerendering :", err.message || err);
        if (previewOutput && !previewExited) {
            console.error("--- Sortie de `vite preview` jusqu'ici ---");
            console.error(previewOutput);
        }
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
        previewProcess.kill();
    }
}

main();