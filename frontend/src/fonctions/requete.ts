import { useErreur } from "../contexts/ErreurContext";
import { useAuth } from "../contexts/AuthContext";
import ErreurRequete from "../classes/ErreurRequete";

export interface RequeteParametres {
    url: string;
    methode?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    corps?: object;
    enTete?: Record<string, string>;
    formData?: boolean;
    blob?: boolean;
}
export type Requete = ReturnType<typeof useRequete>;
export function useRequete() {
    const { setErreur } = useErreur();
    const { deconnexion } = useAuth();

    // `blob: true` renvoie le Blob brut ; sinon `detail` typé par l'appelant (T explicite attendu).
    // En cas d'erreur, l'erreur est remontée via setErreur et la fonction renvoie null.
    function requete(parametres: RequeteParametres & { blob: true }): Promise<Blob | null>;
    function requete<T = unknown>(parametres: RequeteParametres & { blob?: false }): Promise<T | null>;
    async function requete<T = unknown>({ url, methode = "GET", corps, enTete = {}, formData = false, blob = false }: RequeteParametres): Promise<T | Blob | null> {
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
                body: formData ? (corps as FormData) : corps ? JSON.stringify(corps) : undefined,
            });
            const type = req.headers.get("content-type") ?? "";

            if (!req.ok) {
                if (type.includes("application/json")) {
                    const erreur: { detail?: string } = await req.json();
                    throw new Error(erreur.detail);
                }

                throw new ErreurRequete(req.status, `Code ${req.status}`);
            }

            if (blob) {
                return await req.blob();
            }
            const reponse: { etat: boolean; detail: unknown } = await req.json();
            if (!reponse.etat) {
                if (reponse.detail == "Vous n'êtes pas connecté" || reponse.detail == "accueil") {
                    deconnexion();
                } else {
                    throw new Error(reponse.detail as string);
                }
            }
            return reponse.detail as T;
        } catch (erreur) {
            setErreur(erreur as Error);
            return null;
        }
    }

    return requete;
}
