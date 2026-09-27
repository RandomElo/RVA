import { useMemo } from "react";
import { useErreur } from "../contexts/ErreurContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import ErreurRequete from "../classes/ErreurRequete";

// Messages lisibles pour les réponses sans corps JSON (ex. renvoyées par nginx)
const MESSAGES_STATUT: Record<number, string> = {
    413: "Fichier trop volumineux.",
    429: "Trop de requêtes, réessaie dans quelques minutes.",
};

export interface RequeteParametres {
    url: string;
    methode?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    corps?: object;
    enTete?: Record<string, string>;
    formData?: boolean;
    blob?: boolean;
    // Requête de fond (ex. rafraîchissement d'un cache) : un échec renvoie null sans notification ni page d'erreur.
    silencieux?: boolean;
    signal?: AbortSignal;
}
export type Requete = ReturnType<typeof useRequete>;

// Erreur de saisie ou métier (400, 409, 422...) : le message du backend est notifié et la page reste affichée.
// 401/403/404 gardent leur page dédiée, les 5xx la page d'erreur serveur.
function estErreurValidation(erreur: unknown): erreur is ErreurRequete {
    return erreur instanceof ErreurRequete && erreur.status >= 400 && erreur.status < 500 && ![401, 403, 404].includes(erreur.status);
}

export function useRequete() {
    const { setErreur } = useErreur();
    const { deconnexion } = useAuth();
    const { notifier } = useNotifications();

    // Mémorisé : la fonction reste stable entre les rendus (contextes mémorisés), utilisable en dépendance d'effet.
    return useMemo(() => {
        function notifierErreur(message: string) {
            notifier({ type: "erreur", titre: "Erreur", description: message });
        }

        // `blob: true` renvoie le Blob brut (une réponse JSON y est traitée comme une erreur) ; sinon `detail` typé par l'appelant (T explicite attendu).
        // En cas d'erreur, la fonction renvoie null : les erreurs de validation (4xx hors 401/403/404, ou etat false) sont notifiées,
        // les autres sont remontées via setErreur pour afficher une page d'erreur.
        function requete(parametres: RequeteParametres & { blob: true }): Promise<Blob | null>;
        function requete<T = unknown>(parametres: RequeteParametres & { blob?: false }): Promise<T | null>;
        async function requete<T = unknown>({ url, methode = "GET", corps, enTete = {}, formData = false, blob = false, silencieux = false, signal }: RequeteParametres): Promise<T | Blob | null> {
            try {
                const req = await fetch(`${url}`, {
                    method: methode,
                    headers: {
                        ...(!formData && {
                            "Content-Type": "application/json",
                        }),
                        ...enTete,
                    },
                    credentials: "include",
                    signal,
                    body: formData ? (corps as FormData) : corps ? JSON.stringify(corps) : undefined,
                });
                const type = req.headers.get("content-type") ?? "";

                if (!req.ok) {
                    if (type.includes("application/json")) {
                        const erreur: { detail?: string } = await req.json();
                        if (erreur.detail === "Vous n'êtes pas connecté") {
                            deconnexion();
                            return null;
                        }
                        // Statut HTTP transmis pour que l'affichage distingue 403 (AccesRefuse) et 404 (Erreur404) du reste.
                        throw new ErreurRequete(req.status, erreur.detail ?? `Code ${req.status}`);
                    }

                    throw new ErreurRequete(req.status, MESSAGES_STATUT[req.status] ?? `Code ${req.status}`);
                }

                // En mode blob, une réponse JSON n'est pas un fichier : elle est lue pour remonter l'erreur au lieu d'être renvoyée comme Blob.
                if (blob && !type.includes("application/json")) {
                    return await req.blob();
                }
                const reponse: { etat: boolean; detail: unknown } = await req.json();
                if (!reponse.etat) {
                    if (silencieux) return null;
                    notifierErreur(typeof reponse.detail === "string" ? reponse.detail : "La demande n'a pas pu aboutir");
                    return null;
                }
                if (blob) {
                    throw new Error("Réponse inattendue : un fichier était attendu");
                }
                return reponse.detail as T;
            } catch (erreur) {
                if (silencieux || signal?.aborted) return null;
                if (estErreurValidation(erreur)) {
                    notifierErreur(erreur.message);
                    return null;
                }
                setErreur(erreur as Error);
                return null;
            }
        }

        return requete;
    }, [setErreur, deconnexion, notifier]);
}
