import { describe, expect, it } from "vitest";

import type { ArticleFormValue } from "../constantes/types/blog";
import { MESSAGE_DESCRIPTION, MESSAGE_SLUG, validerRedaction } from "./validationRedaction";

const VALIDE: ArticleFormValue = {
    titre: "Retour sur le Téléthon",
    categorie: "actu_publique",
    url: "telethon-2026",
    imageUrl: "",
    urlCanva: "",
    contenuHtml: "<p>Bonjour</p>",
    description: "Une courte description",
    datePublication: "2026-03-15",
    dansNavigation: false,
};

const VINGT_ET_UN_MOTS = Array.from({ length: 21 }, (_, i) => "mot" + i).join(" ");

describe("validerRedaction", () => {
    it("accepte un article complet", () => {
        expect(validerRedaction(VALIDE, "nouvelArticle", false)).toEqual({ erreurs: {}, erreurPresente: false });
    });

    it("signale le titre manquant avant le chemin invalide", () => {
        const { erreurs, erreurPresente } = validerRedaction({ ...VALIDE, titre: "  ", url: "a" }, "nouvelArticle", false);
        expect(erreurs).toEqual({ titre: "Le titre est obligatoire." });
        expect(erreurPresente).toBe(true);
    });

    it("signale un chemin d'accès invalide", () => {
        const { erreurs, erreurPresente } = validerRedaction({ ...VALIDE, url: "Mon-Article" }, "nouvelArticle", false);
        expect(erreurs).toEqual({ url: MESSAGE_SLUG });
        expect(erreurPresente).toBe(true);
    });

    it("limite la description à 20 mots pour un article, pas pour une page", () => {
        const valeur = { ...VALIDE, description: VINGT_ET_UN_MOTS };
        expect(validerRedaction(valeur, "nouvelArticle", false).erreurs).toEqual({ description: MESSAGE_DESCRIPTION });
        expect(validerRedaction(valeur, "nouvellePage", false).erreurs).toEqual({});
    });

    it("refuse un contenu vide sans afficher le bandeau d'erreur, sauf newsletter et album", () => {
        expect(validerRedaction(VALIDE, "nouvelArticle", true)).toEqual({
            erreurs: { contenuHtml: "L'article ne peut pas être vide." },
            erreurPresente: false,
        });
        expect(validerRedaction({ ...VALIDE, categorie: "newsletter" }, "nouvelArticle", true).erreurs).toEqual({});
        expect(validerRedaction({ ...VALIDE, categorie: "album_photo" }, "nouvelArticle", true).erreurs).toEqual({});
    });

    it("exige une date de publication pour un article uniquement", () => {
        const valeur = { ...VALIDE, datePublication: "" };
        expect(validerRedaction(valeur, "nouvelArticle", false).erreurs).toEqual({ datePublication: "Choisissez une date de publication." });
        expect(validerRedaction(valeur, "nouvellePage", false).erreurs).toEqual({});
    });
});
