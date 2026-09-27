import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErreurRequete from "../classes/ErreurRequete";
import { useRequete } from "./requete";

const deconnexion = vi.fn();
const setErreur = vi.fn();
const notifier = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
    useAuth: () => ({ deconnexion }),
}));
vi.mock("../contexts/ErreurContext", () => ({
    useErreur: () => ({ setErreur }),
}));
vi.mock("../contexts/NotificationsContext", () => ({
    useNotifications: () => ({ notifier }),
}));

function reponseJSON(corps: unknown, status = 200) {
    return new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });
}

function stubFetch(reponse: Response) {
    const fetchMock = vi.fn().mockResolvedValue(reponse);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function monterRequete() {
    return renderHook(() => useRequete()).result.current;
}

describe("useRequete", () => {
    beforeEach(() => {
        deconnexion.mockClear();
        setErreur.mockClear();
        notifier.mockClear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("déconnecte sans afficher d'erreur quand le backend répond 403 « Vous n'êtes pas connecté »", async () => {
        stubFetch(reponseJSON({ etat: false, detail: "Vous n'êtes pas connecté" }, 403));
        const resultat = await monterRequete()({ url: "/admin/test" });

        expect(resultat).toBeNull();
        expect(deconnexion).toHaveBeenCalledTimes(1);
        expect(setErreur).not.toHaveBeenCalled();
    });

    it("renvoie detail quand la réponse est valide", async () => {
        stubFetch(reponseJSON({ etat: true, detail: [1] }));
        const resultat = await monterRequete()<number[]>({ url: "/liste" });

        expect(resultat).toEqual([1]);
        expect(deconnexion).not.toHaveBeenCalled();
        expect(setErreur).not.toHaveBeenCalled();
    });

    it("notifie l'erreur métier sans page d'erreur quand etat vaut false", async () => {
        stubFetch(reponseJSON({ etat: false, detail: "X" }));
        const resultat = await monterRequete()({ url: "/action", methode: "POST", corps: { a: 1 } });

        expect(resultat).toBeNull();
        expect(deconnexion).not.toHaveBeenCalled();
        expect(setErreur).not.toHaveBeenCalled();
        expect(notifier).toHaveBeenCalledWith({ type: "erreur", titre: "Erreur", description: "X" });
    });

    it("remonte l'erreur réseau vers la page d'erreur sans notifier", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        const resultat = await monterRequete()({ url: "/liste" });

        expect(resultat).toBeNull();
        expect(notifier).not.toHaveBeenCalled();
        expect(setErreur).toHaveBeenCalledTimes(1);
        expect(setErreur.mock.calls[0][0]).toBeInstanceOf(TypeError);
    });

    it("remonte une ErreurRequete avec le statut quand la réponse d'erreur n'est pas du JSON", async () => {
        stubFetch(new Response("Erreur interne", { status: 500, headers: { "Content-Type": "text/plain" } }));
        const resultat = await monterRequete()({ url: "/panne" });

        expect(resultat).toBeNull();
        expect(deconnexion).not.toHaveBeenCalled();
        expect(setErreur).toHaveBeenCalledTimes(1);
        const erreur = setErreur.mock.calls[0][0];
        expect(erreur).toBeInstanceOf(ErreurRequete);
        expect(erreur.status).toBe(500);
        expect(notifier).not.toHaveBeenCalled();
    });

    it("renvoie le Blob brut en mode blob", async () => {
        stubFetch(new Response("contenu", { status: 200, headers: { "Content-Type": "application/pdf" } }));
        const resultat = await monterRequete()({ url: "/fichier", blob: true });

        // Le Blob vient du fetch de Node, pas de jsdom : on vérifie le contenu plutôt que instanceof.
        expect(resultat?.type).toBe("application/pdf");
        expect(await resultat?.text()).toBe("contenu");
        expect(setErreur).not.toHaveBeenCalled();
    });

    it("déconnecte en mode blob quand le backend répond 403 « Vous n'êtes pas connecté »", async () => {
        stubFetch(reponseJSON({ etat: false, detail: "Vous n'êtes pas connecté" }, 403));
        const resultat = await monterRequete()({ url: "/fichier", blob: true });

        expect(resultat).toBeNull();
        expect(deconnexion).toHaveBeenCalledTimes(1);
        expect(setErreur).not.toHaveBeenCalled();
    });

    it("notifie l'erreur métier au lieu de renvoyer un Blob quand la réponse JSON a etat false en mode blob", async () => {
        stubFetch(reponseJSON({ etat: false, detail: "Newsletter introuvable" }));
        const resultat = await monterRequete()({ url: "/fichier", blob: true });

        expect(resultat).toBeNull();
        expect(deconnexion).not.toHaveBeenCalled();
        expect(setErreur).not.toHaveBeenCalled();
        expect(notifier).toHaveBeenCalledWith({ type: "erreur", titre: "Erreur", description: "Newsletter introuvable" });
    });

    it("ne renvoie pas une réponse JSON comme Blob en mode blob, même avec etat true", async () => {
        stubFetch(reponseJSON({ etat: true, detail: "ok" }));
        const resultat = await monterRequete()({ url: "/fichier", blob: true });

        expect(resultat).toBeNull();
        expect(deconnexion).not.toHaveBeenCalled();
        expect(setErreur).toHaveBeenCalledTimes(1);
        expect(setErreur.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it("remonte une ErreurRequete 403 quand le backend répond 403 « Accès interdit »", async () => {
        stubFetch(reponseJSON({ etat: false, detail: "Accès interdit" }, 403));
        const resultat = await monterRequete()({ url: "/admin/test" });

        expect(resultat).toBeNull();
        expect(deconnexion).not.toHaveBeenCalled();
        expect(setErreur).toHaveBeenCalledTimes(1);
        const erreur = setErreur.mock.calls[0][0];
        expect(erreur).toBeInstanceOf(ErreurRequete);
        expect(erreur.status).toBe(403);
        expect(erreur.message).toBe("Accès interdit");
        expect(notifier).not.toHaveBeenCalled();
    });

    it("remonte une ErreurRequete 404 quand le backend répond 404 en JSON", async () => {
        stubFetch(reponseJSON({ etat: false, detail: "Ressource introuvable" }, 404));
        const resultat = await monterRequete()({ url: "/articles/inconnu" });

        expect(resultat).toBeNull();
        expect(setErreur).toHaveBeenCalledTimes(1);
        const erreur = setErreur.mock.calls[0][0];
        expect(erreur).toBeInstanceOf(ErreurRequete);
        expect(erreur.status).toBe(404);
        expect(erreur.message).toBe("Ressource introuvable");
        expect(notifier).not.toHaveBeenCalled();
    });

    it("notifie le message du backend sans page d'erreur pour une erreur de validation 400", async () => {
        stubFetch(reponseJSON({ etat: false, detail: "Requête incorrecte" }, 400));
        const resultat = await monterRequete()({ url: "/action", methode: "POST", corps: {} });

        expect(resultat).toBeNull();
        expect(deconnexion).not.toHaveBeenCalled();
        expect(setErreur).not.toHaveBeenCalled();
        expect(notifier).toHaveBeenCalledWith({ type: "erreur", titre: "Erreur", description: "Requête incorrecte" });
    });

    it("notifie le message du backend sans page d'erreur pour un conflit 409", async () => {
        stubFetch(reponseJSON({ etat: false, detail: "Adresse déjà utilisée" }, 409));
        const resultat = await monterRequete()({ url: "/action", methode: "POST", corps: {} });

        expect(resultat).toBeNull();
        expect(setErreur).not.toHaveBeenCalled();
        expect(notifier).toHaveBeenCalledWith({ type: "erreur", titre: "Erreur", description: "Adresse déjà utilisée" });
    });

    it("utilise « Code <statut> » quand la réponse JSON d'erreur n'a pas de detail", async () => {
        stubFetch(reponseJSON({ etat: false }, 409));
        await monterRequete()({ url: "/action", methode: "POST" });

        expect(setErreur).not.toHaveBeenCalled();
        expect(notifier).toHaveBeenCalledWith({ type: "erreur", titre: "Erreur", description: "Code 409" });
    });
});
