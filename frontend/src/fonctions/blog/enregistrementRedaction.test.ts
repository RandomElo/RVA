import { describe, expect, it } from "vitest";

import type { ArticleFormValue, PhotoAlbum } from "../../constantes/types/blog";
import { destinationApresArticle, genererTitreNewsletter, requeteArticle, requetePage } from "./enregistrementRedaction";

const ARTICLE: ArticleFormValue = {
    titre: "Retour sur le Téléthon",
    categorie: "actu_publique",
    url: "telethon-2026",
    imageUrl: "",
    urlCanva: "",
    contenuHtml: "<p>Bonjour</p>",
    description: "",
    datePublication: "2026-03-15",
    dansNavigation: false,
};

const PHOTOS: PhotoAlbum[] = [{ chemin: "photo.webp", legende: "Départ" }];

describe("requeteArticle", () => {
    it("choisit la route de création selon la catégorie", () => {
        const options = { role: "administrateur" as const, photosAlbum: null };
        expect(requeteArticle(ARTICLE, "publie", options)).toEqual({ url: "/articles/cree", corps: { article: ARTICLE, statut: "publie" } });
        expect(requeteArticle({ ...ARTICLE, categorie: "newsletter" }, "publie", options).url).toBe("/articles/cree-newsletter");
        expect(requeteArticle({ ...ARTICLE, categorie: "album_photo" }, "publie", options).url).toBe("/articles/cree-album");
    });

    it("passe par les routes de modification avec l'id de l'article existant", () => {
        const existant = { ...ARTICLE, id: "42" };
        const options = { articleExistant: existant, role: "administrateur" as const, photosAlbum: null };
        expect(requeteArticle(ARTICLE, "brouillon", options)).toEqual({ url: "/articles/modifier", corps: { article: ARTICLE, statut: "brouillon", id: "42" } });
        expect(requeteArticle({ ...ARTICLE, categorie: "newsletter" }, "publie", options).url).toBe("/articles/modifier-newsletter");
        expect(requeteArticle({ ...ARTICLE, categorie: "album_photo" }, "publie", options).url).toBe("/articles/modifier-album");
    });

    it("envoie la suggestion d'un adhérent sur une route dédiée", () => {
        expect(requeteArticle(ARTICLE, "publie", { role: "adherent", photosAlbum: null }).url).toBe("/articles/suggestion");
    });

    it("joint les photos pour un album uniquement", () => {
        const album = { ...ARTICLE, categorie: "album_photo" as const };
        expect(requeteArticle(album, "publie", { role: "administrateur", photosAlbum: PHOTOS }).corps).toEqual({ article: album, statut: "publie", photosAlbum: PHOTOS });
        expect(requeteArticle(ARTICLE, "publie", { role: "administrateur", photosAlbum: PHOTOS }).corps).not.toHaveProperty("photosAlbum");
    });
});

describe("destinationApresArticle", () => {
    it("ouvre l'article publié, sinon le blog", () => {
        expect(destinationApresArticle("administrateur", "publie", "/article/telethon-2026")).toBe("/article/telethon-2026");
        expect(destinationApresArticle("administrateur", "publie", [])).toBe("/blog");
        expect(destinationApresArticle("administrateur", "brouillon", "/article/telethon-2026")).toBe("/blog");
        expect(destinationApresArticle("adherent", "publie", "/article/telethon-2026")).toBe("/blog");
    });
});

describe("requetePage", () => {
    it("crée une page avec les seuls champs utiles", () => {
        expect(requetePage({ ...ARTICLE, dansNavigation: true })).toEqual({
            url: "/pages/creation",
            corps: { contenuHtml: "<p>Bonjour</p>", dansNavigation: true, titre: "Retour sur le Téléthon", url: "telethon-2026" },
        });
    });

    it("modifie une page existante en transmettant son ancien chemin", () => {
        const { url, corps } = requetePage({ ...ARTICLE, url: "nouveau-chemin" }, { ...ARTICLE, url: "ancien-chemin" });
        expect(url).toBe("/pages/modification");
        expect(corps).toEqual(expect.objectContaining({ url: "nouveau-chemin", ancienneUrl: "ancien-chemin" }));
    });
});

describe("genererTitreNewsletter", () => {
    it("génère titre et chemin sans accents à partir de la date", () => {
        expect(genererTitreNewsletter("2026-02-10")).toEqual({ titre: "Newsletter Février 2026", url: "newsletter-fevrier-2026" });
    });
});
