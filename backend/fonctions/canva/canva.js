import puppeteer from "puppeteer";
import { logger } from "../utilitaires/logger.js";

// User-Agent de navigateur : Canva refuse ou dégrade les réponses aux clients non navigateurs
export const USER_AGENT_NAVIGATEUR =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// En-têtes supplémentaires utilisés lors de la récupération du design à capturer
export const EN_TETES_CAPTURE = {
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.canva.com/",
};

// Erreur Canva identifiable par son code, que chaque contrôleur traduit dans son propre message
export class ErreurCanva extends Error {
    constructor(code, message = code) {
        super(message);
        this.name = "ErreurCanva";
        this.code = code;
    }
}

export const CODES_ERREUR_CANVA = Object.freeze({
    RESOLUTION_IMPOSSIBLE: "RESOLUTION_IMPOSSIBLE",
    REDIRECTION_INVALIDE: "REDIRECTION_INVALIDE",
    DOMAINE_NON_AUTORISE: "DOMAINE_NON_AUTORISE",
    OEMBED_INDISPONIBLE: "OEMBED_INDISPONIBLE",
    IFRAME_INTROUVABLE: "IFRAME_INTROUVABLE",
    CAPTURE_ECHEC: "CAPTURE_ECHEC",
});

/**
 * Vérifie que l'URL utilise HTTPS et pointe vers un (sous-)domaine Canva
 * officiel, afin d'éviter que le serveur ne serve de proxy pour récupérer
 * n'importe quelle URL arbitraire (SSRF).
 */
export function estUrlCanvaAutorisee(urlObjet) {
    if (urlObjet.protocol !== "https:") {
        return false;
    }

    const hote = urlObjet.hostname.toLowerCase();

    const domainesAutorises = [
        "canva.com",
        "canva.link",
        "canva.site", // domaine utilisé pour certains liens courts Canva
    ];

    return domainesAutorises.some(
        (domaine) => hote === domaine || hote.endsWith(`.${domaine}`)
    );
}

/**
 * Résout un lien Canva (souvent court) vers l'URL canonique du design, revalide
 * cette URL avec la liste blanche (Canva pourrait rediriger vers un domaine tiers,
 * ex. open redirect) puis appelle l'oEmbed Canva.
 * L'URL de départ doit avoir été validée par l'appelant.
 * Renvoie { urlFinale, data } ou lève une ErreurCanva (les erreurs réseau sont propagées telles quelles).
 */
export async function resoudreOembedCanva(url, { enTetes = {} } = {}) {
    const enTetesNavigateur = { "User-Agent": USER_AGENT_NAVIGATEUR, ...enTetes };

    // 1. Résoudre le lien court vers l'URL canonique du design
    const reponseRedirection = await fetch(url, {
        redirect: "follow",
        headers: enTetesNavigateur,
    });

    if (!reponseRedirection.url) {
        throw new ErreurCanva(CODES_ERREUR_CANVA.RESOLUTION_IMPOSSIBLE);
    }

    // 2. Revalider l'URL canonique obtenue après redirection
    let urlFinale;
    try {
        urlFinale = new URL(reponseRedirection.url);
    } catch {
        throw new ErreurCanva(CODES_ERREUR_CANVA.REDIRECTION_INVALIDE);
    }

    if (!estUrlCanvaAutorisee(urlFinale)) {
        throw new ErreurCanva(CODES_ERREUR_CANVA.DOMAINE_NON_AUTORISE);
    }

    // 3. Appeler oEmbed avec l'URL canonique
    const reponseOembed = await fetch(
        `https://www.canva.com/_oembed?url=${encodeURIComponent(urlFinale.toString())}`,
        { headers: enTetesNavigateur }
    );

    if (!reponseOembed.ok) {
        throw new ErreurCanva(CODES_ERREUR_CANVA.OEMBED_INDISPONIBLE);
    }

    const data = await reponseOembed.json();
    return { urlFinale, data };
}

// URL de l'iframe d'intégration contenue dans le html oEmbed, ou undefined
export function extraireUrlIframe(dataOembed) {
    return dataOembed?.html?.match(/src="([^"]+)"/)?.[1];
}

export async function capturerCanvaEnImage(urlIframe) {
    const navigateur = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    try {
        const page = await navigateur.newPage();
        await page.setUserAgent(USER_AGENT_NAVIGATEUR);
        await page.setViewport({ width: 1280, height: 720 });

        await page.goto(urlIframe, { waitUntil: "networkidle0", timeout: 30000 });

        // Le design Canva se dessine en JS/canvas, on laisse un peu de marge
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await page.screenshot({ type: "webp", quality: 90 });
    } finally {
        await navigateur.close();
    }
}

/**
 * Résout le lien Canva, récupère l'iframe d'intégration via oEmbed puis la capture
 * en image, pour ne plus dépendre de Canva à l'affichage.
 * Renvoie le tampon de l'image ou lève une ErreurCanva.
 */
export async function resoudreEtCapturerCanva(urlCanva) {
    const { data } = await resoudreOembedCanva(urlCanva, { enTetes: EN_TETES_CAPTURE });

    const urlIframe = extraireUrlIframe(data);
    if (!urlIframe) {
        throw new ErreurCanva(CODES_ERREUR_CANVA.IFRAME_INTROUVABLE);
    }

    try {
        return await capturerCanvaEnImage(urlIframe);
    } catch (e) {
        logger.error({ type: "CANVA_CAPTURE_ERREUR", erreur: e?.message }, "Erreur capture Canva");
        throw new ErreurCanva(CODES_ERREUR_CANVA.CAPTURE_ECHEC);
    }
}
