import type { ArticleFormValue } from "../constantes/types/blog";

/** Chemin d'accès d'un article : 6 caractères minimum, minuscules/chiffres/tirets, sans tirets consécutifs ni en bordure. */
export const REGEX_SLUG = /^(?!-)(?!.*--)[a-z0-9-]{6,}(?<!-)$/;

export const MESSAGE_SLUG = "6 caractères minimum, lettres minuscules/chiffres/tirets, sans tirets consécutifs ni en bordure.";

/** Formulaire de rédaction : article de blog (y compris newsletter et album photo) ou page statique. */
export type TypeRedaction = "nouvelArticle" | "nouvellePage";
export type ErreursRedaction = Partial<Record<keyof ArticleFormValue, string>>;

export const MESSAGE_DESCRIPTION = "Description maximum de 20 mots.";

export function descriptionTropLongue(description: string): boolean {
    return description.split(" ").length > 20;
}

/**
 * Validation avant publication.
 * Titre, chemin puis description (articles) sont contrôlés dans cet ordre : seule la première erreur est signalée
 * et c'est elle qui affiche le bandeau d'erreur. Contenu vide (hors newsletter et album) et date manquante (articles) s'y ajoutent.
 * `contenuVide` dépend du mode d'édition actif et est calculé par l'appelant.
 */
export function validerRedaction(valeur: ArticleFormValue, type: TypeRedaction, contenuVide: boolean): { erreurs: ErreursRedaction; erreurPresente: boolean } {
    const erreurs: ErreursRedaction = {};
    let erreurPresente = true;

    if (!valeur.titre.trim()) {
        erreurs.titre = "Le titre est obligatoire.";
    } else if (!REGEX_SLUG.test(valeur.url.trim())) {
        erreurs.url = MESSAGE_SLUG;
    } else if (type == "nouvelArticle" && descriptionTropLongue(valeur.description)) {
        erreurs.description = MESSAGE_DESCRIPTION;
    } else {
        erreurPresente = false;
    }

    if (contenuVide && valeur.categorie !== "newsletter" && valeur.categorie !== "album_photo") {
        erreurs.contenuHtml = "L'article ne peut pas être vide.";
    }

    if (type == "nouvelArticle" && !valeur.datePublication) {
        erreurs.datePublication = "Choisissez une date de publication.";
    }

    return { erreurs, erreurPresente };
}
