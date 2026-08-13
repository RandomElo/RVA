const AGENTS_BOTS_CONNUS =
    /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|curl|wget|python-requests|axios|node-fetch|postman|scrapy|headlesschrome/i;

const FENETRE_LIMITE_MS = 60 * 1000; // 1 minute
const SEUIL_EVENEMENTS_PAR_FENETRE = 30; // très large pour un usage normal (navigation + quelques clics)

// Compteur en mémoire : ip -> { debutFenetre, nombre }
// Suffisant pour un site à 130 membres et une seule instance backend.
// À remplacer par un store partagé (Redis) si un jour le backend est multi-instances.
const compteursParIp = new Map();

function estRequeteTropFrequente(ip) {
    const maintenant = Date.now();
    const entree = compteursParIp.get(ip);

    if (!entree || maintenant - entree.debutFenetre > FENETRE_LIMITE_MS) {
        compteursParIp.set(ip, { debutFenetre: maintenant, nombre: 1 });
        return false;
    }

    entree.nombre += 1;
    return entree.nombre > SEUIL_EVENEMENTS_PAR_FENETRE;
}

// Nettoyage périodique pour ne pas faire grossir la Map indéfiniment
setInterval(
    () => {
        const maintenant = Date.now();
        for (const [ip, entree] of compteursParIp) {
            if (maintenant - entree.debutFenetre > FENETRE_LIMITE_MS) {
                compteursParIp.delete(ip);
            }
        }
    },
    5 * 60 * 1000,
).unref();

export function detecterBot(req, res, next) {
    const userAgent = req.get("User-Agent") || "";
    const preuveJs = req.get("X-Client-Js");

    if (!preuveJs || preuveJs !== "1") {
        // Pas de trace d'un vrai navigateur exécutant notre front -> on ignore,
        // sans donner d'indice à l'appelant (pas d'erreur explicite qui aiderait
        // un bot à s'adapter).
        return res.status(204).end();
    }

    if (AGENTS_BOTS_CONNUS.test(userAgent)) {
        return res.status(204).end();
    }

    const ip = req.ip;
    if (estRequeteTropFrequente(ip)) {
        return res.status(204).end();
    }

    next();
}