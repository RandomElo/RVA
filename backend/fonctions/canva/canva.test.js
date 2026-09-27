import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { CODES_ERREUR_CANVA, ErreurCanva, USER_AGENT_NAVIGATEUR, estUrlCanvaAutorisee, extraireUrlIframe, resoudreOembedCanva } from "./canva.js";

// Aucun appel réseau : fetch est remplacé à chaque test
const fetchOriginal = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = fetchOriginal;
});

// Réponses successives de fetch : [redirection, oEmbed]
const simulerFetch = (...reponses) => {
    const appels = [];
    globalThis.fetch = async (url, options) => {
        appels.push({ url, options });
        const reponse = reponses[appels.length - 1];
        if (!reponse) throw new Error("appel réseau inattendu");
        return reponse;
    };
    return appels;
};

const oembed = (data) => ({ ok: true, async json() { return data; } });

const erreurCanva = (code) => (e) => e instanceof ErreurCanva && e.code === code;

test("estUrlCanvaAutorisee : https sur un domaine Canva ou un sous-domaine uniquement", () => {
    for (const url of ["https://canva.com/x", "https://www.canva.com/x", "https://canva.link/a", "https://x.canva.site/"]) {
        assert.equal(estUrlCanvaAutorisee(new URL(url)), true, url);
    }
    for (const url of ["http://www.canva.com/x", "https://canva.com.exemple.fr/", "https://faux-canva.com/", "https://exemple.fr/"]) {
        assert.equal(estUrlCanvaAutorisee(new URL(url)), false, url);
    }
});

test("resoudreOembedCanva : domaine autorisé, oEmbed appelé avec l'URL canonique", async () => {
    const appels = simulerFetch({ url: "https://www.canva.com/design/x/view" }, oembed({ html: "<iframe>" }));
    const { urlFinale, data } = await resoudreOembedCanva("https://canva.link/abc");
    assert.equal(urlFinale.toString(), "https://www.canva.com/design/x/view");
    assert.deepEqual(data, { html: "<iframe>" });
    assert.equal(appels[0].url, "https://canva.link/abc");
    assert.equal(appels[0].options.redirect, "follow");
    assert.equal(appels[1].url, "https://www.canva.com/_oembed?url=" + encodeURIComponent("https://www.canva.com/design/x/view"));
    for (const { options } of appels) {
        assert.equal(options.headers["User-Agent"], USER_AGENT_NAVIGATEUR);
    }
});

test("resoudreOembedCanva : en-têtes supplémentaires ajoutés au User-Agent", async () => {
    const appels = simulerFetch({ url: "https://www.canva.com/design/x/view" }, oembed({}));
    await resoudreOembedCanva("https://canva.link/abc", { enTetes: { Referer: "https://www.canva.com/" } });
    for (const { options } of appels) {
        assert.deepEqual(options.headers, { "User-Agent": USER_AGENT_NAVIGATEUR, Referer: "https://www.canva.com/" });
    }
});

test("resoudreOembedCanva : redirection vers un domaine tiers refusée avant oEmbed", async () => {
    for (const urlRedirection of ["https://malveillant.exemple/page", "http://www.canva.com/design/x", "https://canva.com.exemple.fr/"]) {
        const appels = simulerFetch({ url: urlRedirection });
        await assert.rejects(resoudreOembedCanva("https://canva.link/abc"), erreurCanva(CODES_ERREUR_CANVA.DOMAINE_NON_AUTORISE), urlRedirection);
        assert.equal(appels.length, 1);
    }
});

test("resoudreOembedCanva : redirection sans URL ou URL invalide refusée avant oEmbed", async () => {
    let appels = simulerFetch({ url: "" });
    await assert.rejects(resoudreOembedCanva("https://canva.link/abc"), erreurCanva(CODES_ERREUR_CANVA.RESOLUTION_IMPOSSIBLE));
    assert.equal(appels.length, 1);

    appels = simulerFetch({ url: "pas une url" });
    await assert.rejects(resoudreOembedCanva("https://canva.link/abc"), erreurCanva(CODES_ERREUR_CANVA.REDIRECTION_INVALIDE));
    assert.equal(appels.length, 1);
});

test("resoudreOembedCanva : oEmbed en erreur, OEMBED_INDISPONIBLE", async () => {
    simulerFetch({ url: "https://www.canva.com/design/x/view" }, { ok: false });
    await assert.rejects(resoudreOembedCanva("https://canva.link/abc"), erreurCanva(CODES_ERREUR_CANVA.OEMBED_INDISPONIBLE));
});

test("resoudreOembedCanva : erreur réseau propagée telle quelle", async () => {
    globalThis.fetch = async () => {
        throw new TypeError("fetch failed");
    };
    await assert.rejects(resoudreOembedCanva("https://canva.link/abc"), (e) => e instanceof TypeError && !(e instanceof ErreurCanva));
});

test("extraireUrlIframe : src de l'iframe, sinon undefined", () => {
    assert.equal(extraireUrlIframe({ html: '<iframe src="https://www.canva.com/design/x/view?embed"></iframe>' }), "https://www.canva.com/design/x/view?embed");
    assert.equal(extraireUrlIframe({ html: "<div></div>" }), undefined);
    assert.equal(extraireUrlIframe({}), undefined);
    assert.equal(extraireUrlIframe(null), undefined);
});
