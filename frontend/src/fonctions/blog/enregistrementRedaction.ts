/**
 * Construction des requêtes d'enregistrement du formulaire de rédaction (fonctions pures, testées à part).
 * Chaque formulaire (article, newsletter, album photo, page statique) a sa propre route d'API.
 */

import type { ArticleFormValue, PhotoAlbum } from "../../constantes/types/blog";
import type { Role } from "../../constantes/types/auth";

export type StatutArticle = "brouillon" | "publie";

export type CorpsArticle = {
    article: ArticleFormValue;
    statut: StatutArticle;
    id?: string;
    photosAlbum?: PhotoAlbum[] | null;
};

export type CorpsPage = {
    contenuHtml: string;
    dansNavigation: boolean;
    titre: string;
    url: string;
    ancienneUrl?: string;
};

/** Réponse des routes /articles : `donnees` = chemin de l'article publié, ou liste des articles (admin, hors publication). */
export type ReponseArticle = { article: boolean; detail: string; donnees?: string | unknown[] };
export type ReponsePage = { page: boolean; detail?: string };

const ROUTES_ARTICLE = {
    article: { creation: "/articles/cree", modification: "/articles/modifier" },
    newsletter: { creation: "/articles/cree-newsletter", modification: "/articles/modifier-newsletter" },
    album: { creation: "/articles/cree-album", modification: "/articles/modifier-album" },
};

/**
 * Route et corps de l'enregistrement d'un article.
 * `articleExistant` : données chargées par le loader en modification (absent en création).
 * Un adhérent passe toujours par la route de suggestion.
 */
export function requeteArticle(article: ArticleFormValue, statut: StatutArticle, { articleExistant, role, photosAlbum }: { articleExistant?: ArticleFormValue; role: Role; photosAlbum: PhotoAlbum[] | null }): { url: string; corps: CorpsArticle } {
    const routes = article.categorie == "newsletter" ? ROUTES_ARTICLE.newsletter : article.categorie == "album_photo" ? ROUTES_ARTICLE.album : ROUTES_ARTICLE.article;
    let url = routes.creation;
    let corps: CorpsArticle = { article, statut };
    if (articleExistant) {
        url = routes.modification;
        corps.id = articleExistant.id;
    }

    if (role == "adherent") {
        url = "/articles/suggestion";
    }

    if (article.categorie == "album_photo") {
        corps = { ...corps, photosAlbum };
    }

    return { url, corps };
}

/** Page affichée après un enregistrement d'article réussi. */
export function destinationApresArticle(role: Role, statut: StatutArticle, donnees: ReponseArticle["donnees"]): string {
    if (role == "adherent") return "/blog";
    // Le backend renvoie déjà le chemin complet ("/article/<url>")
    if (statut == "publie" && typeof donnees === "string") return donnees;
    return "/blog";
}

/** Route et corps de l'enregistrement d'une page statique (`pageExistante` : données du loader en modification). */
export function requetePage(page: ArticleFormValue, pageExistante?: ArticleFormValue): { url: string; corps: CorpsPage } {
    const { contenuHtml, dansNavigation, titre, url } = page;

    let corps: CorpsPage = { contenuHtml, dansNavigation, titre, url };
    if (pageExistante) {
        corps = { ...corps, ancienneUrl: pageExistante.url };
    }

    return { url: "/pages/" + (pageExistante ? "modification" : "creation"), corps };
}

/** Titre et chemin d'une newsletter, générés à partir de sa date de publication (ex. "Newsletter Mars 2026" / "newsletter-mars-2026"). */
export function genererTitreNewsletter(datePublication: string): { titre: string; url: string } {
    const date = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(datePublication));
    const dateFormatee = date.charAt(0).toUpperCase() + date.slice(1);

    return {
        titre: "Newsletter " + dateFormatee,
        url: "newsletter-" + dateFormatee.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-"),
    };
}
