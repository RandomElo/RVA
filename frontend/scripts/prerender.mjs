import { spawn } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// dist-source : sortie brute de `vite build`, JAMAIS modifiée par ce script.
// C'est ce dossier que `vite preview` sert pendant toute la boucle Puppeteer.
const sourceDir = path.join(root, "dist-source");

// dist : dossier final livré à Nginx. Assemblé uniquement à la fin,
// une fois toutes les pages capturées.
const distDir = path.join(root, "dist");

// Dossier de travail temporaire pour les HTML générés par Puppeteer.
// Évite d'écrire quoi que ce soit dans sourceDir ou distDir pendant le crawl.
const stagingDir = path.join(root, ".prerender-staging");

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

// Filet de secours : si le prerender échoue, on livre quand même le SPA
// non prérendu plutôt que de casser complètement le build/déploiement.
async function fallbackToClientSideRendering(reason) {
    console.warn(`→ Fallback : copie de dist-source/ vers dist/ sans prerendering. Raison : ${reason}`);
    await rm(distDir, { recursive: true, force: true });
    await cp(sourceDir, distDir, { recursive: true });
}

async function main() {
    if (!existsSync(sourceDir)) {
        throw new Error(
            `dist-source/ introuvable. Lancez \`vite build\` avant ce script (il doit produire dist-source/, voir build.outDir dans vite.config.ts).`
        );
    }

    if (process.env.SKIP_PRERENDER === "true") {
        console.log("→ SKIP_PRERENDER=true détecté. Copie directe de dist-source/ vers dist/.");
        await rm(distDir, { recursive: true, force: true });
        await cp(sourceDir, distDir, { recursive: true });
        return;
    }

    // Repartir d'un staging vierge à chaque run, pour ne jamais réutiliser
    // un HTML généré lors d'un run précédent.
    await rm(stagingDir, { recursive: true, force: true });
    await mkdir(stagingDir, { recursive: true });

    const viteBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");

    console.log(`→ Node ${process.version} détecté.`);
    console.log(`→ Démarrage de \`vite preview\` sur ${BASE_URL} (sert dist-source/)...`);

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
            throw new Error(`\`vite preview\` s'est arrêté prématurément (code ${previewExitCode}).\n${previewOutput}`);
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
                "--disable-extensions",
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

            // Petite pause pour laisser React Helmet finir la mise à jour du DOM.
            // Note : avec sourceDir/distDir séparés, chaque page.goto() part
            // toujours du index.html SPA vide — plus de risque de doublon
            // structurel. Ce délai reste une marge de sécurité pour Helmet.
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Nettoyage best-effort : ne devrait normalement plus rien trouver
            // à dédupliquer, mais reste utile contre d'éventuelles extensions
            // navigateur (Merci-App, Microsoft Editor, etc.) qui s'injectent
            // au niveau du profil Chromium plutôt que de la page.
            await page.evaluate((currentRoute, domain) => {
                const deduplicate = (selector) => {
                    const nodes = Array.from(document.querySelectorAll(selector));
                    if (nodes.length > 1) {
                        nodes.slice(0, -1).forEach((node) => node.remove());
                    }
                };

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

                const canonical = document.querySelector('link[rel="canonical"]');
                if (canonical) {
                    canonical.setAttribute('href', `https://${domain}${currentRoute}`);
                }
            }, route, NOM_DOMAINE);

            let html = await page.content();

            const localUrlRegex = new RegExp(`http://(?:127\\.0\\.0\\.1|${HOST}):\\d+`, "g");
            html = html.replace(localUrlRegex, "");

            // Écriture dans le staging, jamais dans dist-source ni dist directement.
            const outDir = route === "/" ? stagingDir : path.join(stagingDir, route.replace(/^\//, ""));
            await mkdir(outDir, { recursive: true });
            await writeFile(path.join(outDir, "index.html"), html, "utf-8");

            console.log("ok");
        }

        console.log("→ Toutes les routes capturées. Assemblage de dist/...");

        // 1. dist/ repart de zéro à partir de dist-source/ (JS, CSS, assets,
        //    et l'index.html SPA d'origine pour les routes non listées).
        await rm(distDir, { recursive: true, force: true });
        await cp(sourceDir, distDir, { recursive: true });

        // 2. On écrase ensuite avec les HTML prérendus du staging.
        await cp(stagingDir, distDir, { recursive: true });

        // 3. Nettoyage du staging.
        await rm(stagingDir, { recursive: true, force: true });

        console.log("✓ Prerendering terminé avec succès. dist/ est prêt.");
    } catch (err) {
        console.error("✗ Échec du prerendering :", err.message || err);
        try {
            await fallbackToClientSideRendering(err.message || String(err));
            console.log("✓ dist/ contient malgré tout un build fonctionnel (non prérendu).");
        } catch (fallbackErr) {
            console.error("✗ Le fallback a lui aussi échoué :", fallbackErr.message || fallbackErr);
            process.exitCode = 1;
        }
    } finally {
        if (browser) await browser.close();
        previewProcess.kill();
        await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    }
}

main();