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

const env = loadEnv(process.env.NODE_ENV || "production", root, "");

const PORT = env.VITE_PRERENDER_PORT || process.env.VITE_PRERENDER_PORT || 4173;
const INTERNAL_SECRET = env.INTERNAL_SECRET || process.env.INTERNAL_SECRET;
const NOM_DOMAINE = env.VITE_NOM_DOMAINE || "rva.smce.ovh";

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
            res.resume();
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
    if (process.env.SKIP_PRERENDER === "true") {
        console.log("→ SKIP_PRERENDER=true détecté. Prerendering ignoré.");
        return;
    }

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

    previewProcess.stdout.on("data", (d) => { previewOutput += d.toString(); });
    previewProcess.stderr.on("data", (d) => { previewOutput += d.toString(); });
    previewProcess.on("exit", (code) => {
        previewExited = true;
        previewExitCode = code;
    });

    let browser;
    try {
        await waitForServer(BASE_URL);
        if (previewExited) {
            throw new Error(`\`vite preview\` s'est arrêté prématurément (code ${previewExitCode}).`);
        }
        console.log("→ Serveur preview prêt. Lancement de Puppeteer...");

        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions", // Désactive les extensions Chrome intempestives
            ],
        });
        const page = await browser.newPage();

        if (INTERNAL_SECRET) {
            await page.setExtraHTTPHeaders({
                "x-internal-secret": INTERNAL_SECRET,
            });
        }

        for (const route of routes) {
            const url = `${BASE_URL}${route}`;
            process.stdout.write(`  · ${route} ... `);

            await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

            // 1. Petite pause pour laisser React Helmet finir la mise à jour du DOM
            await new Promise((resolve) => setTimeout(resolve, 500));

            // 2. Nettoyage absolu des doublons et des scories d'extensions
            await page.evaluate((currentRoute, domain) => {
                // Supprime TOUS les doublons en ne gardant strictement que le dernier élément injecté par Helmet
                const deduplicate = (selector) => {
                    const nodes = Array.from(document.querySelectorAll(selector));
                    if (nodes.length > 1) {
                        nodes.slice(0, -1).forEach((node) => node.remove());
                    }
                };

                // Liste de toutes les balises SEO à purger
                deduplicate('title');
                deduplicate('meta[name="description"]');
                deduplicate('link[rel="canonical"]');
                deduplicate('link[rel="preload"][as="image"]');
                deduplicate('meta[name="twitter:card"]');
                deduplicate('meta[name="twitter:title"]');
                deduplicate('meta[name="twitter:description"]');
                deduplicate('meta[name="twitter:image"]');

                const ogProps = [
                    'og:site_name', 'og:title', 'og:description',
                    'og:url', 'og:type', 'og:image', 'og:locale'
                ];
                ogProps.forEach((prop) => deduplicate(`meta[property="${prop}"]`));

                // Suppression chirurgicale du bloc CSS inséré par Merci-App / extensions Chrome
                document.querySelectorAll('style, script').forEach((el) => {
                    const content = el.textContent || '';
                    if (
                        content.includes('ms-editor') ||
                        content.includes('merci-app') ||
                        content.includes('SpellingError')
                    ) {
                        el.remove();
                    }
                });

                // S'assure que le canonical pointe sur l'URL finale propre
                const canonical = document.querySelector('link[rel="canonical"]');
                if (canonical) {
                    canonical.setAttribute('href', `https://${domain}${currentRoute}`);
                }
            }, route, NOM_DOMAINE);

            let html = await page.content();

            // Nettoyage des URLs locales 127.0.0.1
            const localUrlRegex = new RegExp(`http://(?:127\\.0\\.0\\.1|${HOST}):\\d+`, "g");
            html = html.replace(localUrlRegex, "");

            // Écriture du fichier HTML
            const outDir = route === "/" ? distDir : path.join(distDir, route.replace(/^\//, ""));
            await mkdir(outDir, { recursive: true });
            await writeFile(path.join(outDir, "index.html"), html, "utf-8");

            console.log("ok");
        }

        console.log("✓ Prerendering terminé avec succès.");
    } catch (err) {
        console.error("✗ Échec du prerendering :", err.message || err);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
        previewProcess.kill();
    }
}

main();