import type { DonneesDashboardStatistiques } from "../../constantes/types/statistiques";

/**
 * Toujours utiliser cette fonction (jamais fetch() directement) pour appeler
 * les routes de tracking : l'en-tête X-Client-Js est la preuve, côté backend,
 * que l'appel vient bien d'un navigateur ayant exécuté notre React (voir
 * backend/middlewares/detectionBot.js). Un bot HTTP "brut" ne pose jamais
 * cet en-tête.
 */
function appelSuivi(chemin: string, corps: Record<string, string>) {
    // On ne bloque jamais l'utilisateur si le tracking échoue : on ne
    // met pas de await côté appelant, et on avale toute erreur réseau.
    fetch(chemin, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Client-Js": "1",
        },
        credentials: "include", // envoie le cookie de session pour identifier adhérent / admin
        body: JSON.stringify(corps),
        keepalive: true, // permet à la requête de partir même si la page se décharge juste après (clic sur lien externe)
    }).catch(() => {
        // silencieux : le suivi ne doit jamais impacter l'expérience utilisateur
    });
}

export function signalerVuePage(chemin: string) {
    appelSuivi("/statistiques/vue", { page: chemin });
}

export async function recupererStatistiquesAdmin(options?: {
    debut?: string;
    fin?: string;
}): Promise<DonneesDashboardStatistiques> {
    const parametres = new URLSearchParams();
    if (options?.debut) parametres.set("debut", options.debut);
    if (options?.fin) parametres.set("fin", options.fin);

    const reponse = await fetch(`/statistiques/recuperation?${parametres.toString()}`, {
        credentials: "include",
    });

    if (!reponse.ok) {
        throw new Error("Impossible de récupérer les statistiques.");
    }

    return reponse.json();
}