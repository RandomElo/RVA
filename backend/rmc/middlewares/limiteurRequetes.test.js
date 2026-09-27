import { test, after } from "node:test";
import assert from "node:assert/strict";
import e from "express";
import request from "supertest";
import { logger } from "../../fonctions/utilitaires/logger.js";

// estEnDev est évalué au chargement du module : l'environnement est fixé avant l'import dynamique.
// npm test force NODE_ENV=test, mais MODE=dev peut venir du conteneur.
const envOriginal = {
    MODE: process.env.MODE,
    NODE_ENV: process.env.NODE_ENV,
    INTERNAL_SECRET: process.env.INTERNAL_SECRET,
};
delete process.env.MODE;
process.env.NODE_ENV = "test";
delete process.env.INTERNAL_SECRET;

const {
    DoitIgnorerLimiter,
    generaleLimiteur,
    authLimiteur,
    formulaireOuMailLimiteur,
    uploadLimiteur,
} = await import("./limiteurRequetes.js");

after(() => {
    for (const [cle, valeur] of Object.entries(envOriginal)) {
        if (valeur === undefined) delete process.env[cle];
        else process.env[cle] = valeur;
    }
});

const SECRET_TEST = "secret-interne-de-test";

const fausseReq = ({ ip, remoteAddress, headers = {} } = {}) => ({ ip, headers, socket: { remoteAddress } });

// Exécute fn (synchrone ou async) avec INTERNAL_SECRET défini (ou supprimé si valeur undefined), puis restaure
const avecSecret = async (valeur, fn) => {
    const precedent = process.env.INTERNAL_SECRET;
    if (valeur === undefined) delete process.env.INTERNAL_SECRET;
    else process.env.INTERNAL_SECRET = valeur;
    try {
        return await fn();
    } finally {
        if (precedent === undefined) delete process.env.INTERNAL_SECRET;
        else process.env.INTERNAL_SECRET = precedent;
    }
};

// --- DoitIgnorerLimiter : adresse de la socket ---

test("DoitIgnorerLimiter : socket depuis une IP publique ou privée, non ignorée", () => {
    for (const remoteAddress of ["8.8.8.8", "203.0.113.7", "::ffff:8.8.8.8", "2001:db8::1", "10.0.0.1", "192.168.1.10"]) {
        assert.equal(DoitIgnorerLimiter(fausseReq({ remoteAddress })), false, remoteAddress);
    }
});

test("DoitIgnorerLimiter : le sous-réseau Docker 172.16.0.0/12 n'est plus exempté", () => {
    for (const adresse of ["172.16.0.1", "172.17.0.1", "172.20.0.9", "172.31.255.255", "::ffff:172.16.0.1", "::ffff:172.31.255.255"]) {
        assert.equal(DoitIgnorerLimiter(fausseReq({ remoteAddress: adresse })), false, `socket ${adresse}`);
        assert.equal(DoitIgnorerLimiter(fausseReq({ ip: adresse, remoteAddress: "172.18.0.3" })), false, `req.ip ${adresse}`);
    }
});

test("DoitIgnorerLimiter : socket localhost ignorée", () => {
    for (const remoteAddress of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
        assert.equal(DoitIgnorerLimiter(fausseReq({ remoteAddress })), true, remoteAddress);
    }
    // Seules ces trois formes exactes sont reconnues
    for (const remoteAddress of ["127.0.0.2", "0.0.0.0", "localhost"]) {
        assert.equal(DoitIgnorerLimiter(fausseReq({ remoteAddress })), false, remoteAddress);
    }
});

test("DoitIgnorerLimiter : req.ip (issu de X-Forwarded-For) n'est jamais utilisé", () => {
    // Un req.ip localhost falsifié via X-Forwarded-For ne suffit pas
    for (const ip of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
        assert.equal(DoitIgnorerLimiter(fausseReq({ ip, remoteAddress: "172.18.0.3" })), false, ip);
    }
    // Une connexion réellement locale reste interne, quel que soit req.ip
    assert.equal(DoitIgnorerLimiter(fausseReq({ ip: "8.8.8.8", remoteAddress: "127.0.0.1" })), true);
});

test("DoitIgnorerLimiter : aucune adresse connue, non ignorée", () => {
    assert.equal(DoitIgnorerLimiter(fausseReq()), false);
    assert.equal(DoitIgnorerLimiter({ ip: "127.0.0.1", headers: {} }), false);
});

// --- DoitIgnorerLimiter : en-tête secret ---

test("DoitIgnorerLimiter : en-tête x-internal-secret correct, ignoré même depuis une IP publique", async () => {
    await avecSecret(SECRET_TEST, () => {
        const req = fausseReq({ remoteAddress: "8.8.8.8", headers: { "x-internal-secret": SECRET_TEST } });
        assert.equal(DoitIgnorerLimiter(req), true);
    });
});

test("DoitIgnorerLimiter : en-tête x-internal-secret faux, vide, absent ou tableau, non ignoré", async () => {
    await avecSecret(SECRET_TEST, () => {
        for (const valeur of [`${SECRET_TEST}x`, "autre", "", undefined, [SECRET_TEST], [SECRET_TEST, SECRET_TEST]]) {
            const req = fausseReq({ remoteAddress: "8.8.8.8", headers: { "x-internal-secret": valeur } });
            assert.equal(DoitIgnorerLimiter(req), false, JSON.stringify(valeur));
        }
    });
});

test("DoitIgnorerLimiter : INTERNAL_SECRET absent ou vide, l'en-tête ne permet pas le bypass", async () => {
    for (const secretEnv of [undefined, ""]) {
        await avecSecret(secretEnv, () => {
            for (const valeur of ["", "undefined", "n'importe quoi"]) {
                const req = fausseReq({ remoteAddress: "8.8.8.8", headers: { "x-internal-secret": valeur } });
                assert.equal(DoitIgnorerLimiter(req), false, `${secretEnv} / ${valeur}`);
            }
        });
    }
});

// --- Mode développement (évalué au chargement du module) ---

// Importe une nouvelle instance du module avec l'environnement donné, en capturant logger.warn
const importerAvecEnv = async (env, url) => {
    const avant = { MODE: process.env.MODE, NODE_ENV: process.env.NODE_ENV };
    const warnOriginal = logger.warn;
    const avertissements = [];
    logger.warn = (...args) => { avertissements.push(args); };
    for (const [cle, valeur] of Object.entries(env)) {
        if (valeur === undefined) delete process.env[cle];
        else process.env[cle] = valeur;
    }
    try {
        const module = await import(url);
        return { module, avertissements };
    } finally {
        logger.warn = warnOriginal;
        for (const [cle, valeur] of Object.entries(avant)) {
            if (valeur === undefined) delete process.env[cle];
            else process.env[cle] = valeur;
        }
    }
};

const estAvertissementLimiteursDesactives = ([objet]) => objet?.type === "RATE_LIMIT_DISABLED";

test("DoitIgnorerLimiter : MODE=dev ou NODE_ENV=development, tout est ignoré, sans avertissement hors production", async () => {
    const cas = [
        { env: { MODE: "dev", NODE_ENV: "test" }, url: "./limiteurRequetes.js?cas=mode-dev" },
        { env: { MODE: undefined, NODE_ENV: "development" }, url: "./limiteurRequetes.js?cas=node-env-development" },
    ];
    for (const { env, url } of cas) {
        const { module, avertissements } = await importerAvecEnv(env, url);
        assert.equal(module.DoitIgnorerLimiter(fausseReq({ remoteAddress: "8.8.8.8" })), true, url);
        assert.equal(avertissements.filter(estAvertissementLimiteursDesactives).length, 0, url);
    }
});

test("Mode développement actif en production : un avertissement unique au chargement", async () => {
    const cas = [
        { env: { MODE: "dev", NODE_ENV: "production" }, url: "./limiteurRequetes.js?cas=mode-dev-en-prod" },
        { env: { MODE: "production", NODE_ENV: "development" }, url: "./limiteurRequetes.js?cas=node-env-dev-en-prod" },
    ];
    for (const { env, url } of cas) {
        const { module, avertissements } = await importerAvecEnv(env, url);
        assert.equal(module.DoitIgnorerLimiter(fausseReq({ remoteAddress: "8.8.8.8" })), true, url);
        assert.equal(avertissements.filter(estAvertissementLimiteursDesactives).length, 1, url);
    }
});

test("Production sans mode développement : aucun avertissement", async () => {
    const { module, avertissements } = await importerAvecEnv(
        { MODE: "production", NODE_ENV: "production" },
        "./limiteurRequetes.js?cas=production"
    );
    assert.equal(module.DoitIgnorerLimiter(fausseReq({ remoteAddress: "8.8.8.8" })), false);
    assert.equal(avertissements.filter(estAvertissementLimiteursDesactives).length, 0);
});

// --- Limiteurs branchés sur une application Express ---

// Adresse du conteneur nginx sur le réseau Docker
const IP_NGINX = "172.18.0.3";

// Même réglage que serveur.js : un proxy (nginx) de confiance, req.ip vient de X-Forwarded-For.
// supertest se connecte depuis 127.0.0.1 : l'adresse de la socket est remplacée pour simuler
// une connexion venant de nginx (ou d'ailleurs via l'en-tête de test X-Test-Socket).
const creerApp = (limiteur) => {
    const app = e();
    app.set("trust proxy", 1);
    app.use((req, res, next) => {
        Object.defineProperty(req.socket, "remoteAddress", {
            value: req.headers["x-test-socket"] || IP_NGINX,
            configurable: true,
        });
        next();
    });
    app.use(limiteur);
    app.get("/", (req, res) => res.json({ etat: true }));
    return app;
};

const limiteurs = [
    {
        nom: "generaleLimiteur",
        limiteur: generaleLimiteur,
        max: 300,
        detail: "Trop de requêtes provenant de cette IP, veuillez réessayer dans 15 minutes.",
        ip: "203.0.113.1",
    },
    {
        nom: "authLimiteur",
        limiteur: authLimiteur,
        max: 10,
        detail: "Trop de tentatives de connexion/vérification. Réessayez dans 15 minutes.",
        ip: "203.0.113.2",
    },
    {
        nom: "formulaireOuMailLimiteur",
        limiteur: formulaireOuMailLimiteur,
        max: 10,
        detail: "Vous avez dépassé la limite d'envoi. Veuillez réessayer plus tard.",
        ip: "203.0.113.3",
    },
    {
        nom: "uploadLimiteur",
        limiteur: uploadLimiteur,
        max: 15,
        detail: "Trop de fichiers envoyés. Patientez quelques minutes.",
        ip: "203.0.113.4",
    },
];

for (const { nom, limiteur, max, detail, ip } of limiteurs) {
    test(`${nom} : ${max} requêtes acceptées puis 429 avec son message, sauf bypass`, async () => {
        const app = creerApp(limiteur);
        const agent = request(app);

        for (let i = 0; i < max; i++) {
            const reponse = await agent.get("/").set("X-Forwarded-For", ip);
            assert.equal(reponse.status, 200, `requête ${i + 1}`);
        }

        const bloquee = await agent.get("/").set("X-Forwarded-For", ip);
        assert.equal(bloquee.status, 429);
        assert.deepEqual(bloquee.body, { etat: false, detail });

        // L'IP bloquée repasse avec le secret interne (skip branché sur DoitIgnorerLimiter)
        await avecSecret(SECRET_TEST, async () => {
            const avecEnTete = await agent.get("/").set("X-Forwarded-For", ip).set("X-Internal-Secret", SECRET_TEST);
            assert.equal(avecEnTete.status, 200);
            const mauvaisEnTete = await agent.get("/").set("X-Forwarded-For", ip).set("X-Internal-Secret", "faux");
            assert.equal(mauvaisEnTete.status, 429);
        });

        // Une IP du réseau Docker annoncée dans X-Forwarded-For est limitée comme les autres
        for (let i = 0; i < max; i++) {
            const reponse = await agent.get("/").set("X-Forwarded-For", "172.17.0.1");
            assert.equal(reponse.status, 200, `172.17.0.1, requête ${i + 1}`);
        }
        const usurpee = await agent.get("/").set("X-Forwarded-For", "172.17.0.1");
        assert.equal(usurpee.status, 429);

        // Une connexion TCP réellement locale (healthcheck) n'est pas limitée, même avec un X-Forwarded-For bloqué
        const locale = await agent.get("/").set("X-Test-Socket", "127.0.0.1").set("X-Forwarded-For", ip);
        assert.equal(locale.status, 200);
    });
}
