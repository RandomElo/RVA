import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import Generale from "../generale/Generale";
import Erreur404 from "./Erreur404";
import AccesRefuse from "./AccesRefuse";
import Erreur500 from "./Erreur500";

/**
 * errorElement du createBrowserRouter.
 *
 * Dispatch selon le type d'erreur :
 * - 404               -> Erreur404 (page introuvable, publique)
 * - 401 / 403         -> AccesRefuse (route qui nécessite d'être connecté / admin)
 * - tout le reste      -> Erreur500 (bug applicatif, erreur réseau, etc.)
 *
 * ⚠️ Ce qui a changé par rapport à la version précédente :
 * 1. Suppression du useEffect qui redirigeait TOUT visiteur non connecté vers /connexion,
 *    quelle que soit l'erreur. Ça avait pour effet de masquer un vrai 404 public (une simple
 *    faute de frappe dans l'URL par un visiteur non connecté atterrissait sur /connexion au
 *    lieu de voir "page introuvable" — trompeur, et ça cachait aussi les vraies erreurs 500).
 *    La redirection vers la connexion ne doit se déclencher que si l'erreur EST un 401/403,
 *    ce qui est maintenant le cas (bouton "Se connecter" dans AccesRefuse, pas une redirection
 *    automatique — on laisse la personne comprendre pourquoi, ce qui est plus rassurant qu'un
 *    changement de page silencieux).
 * 2. Le message d'erreur brut n'est plus affiché en production (fuite d'information potentielle :
 *    stack trace, requête SQL, chemin serveur...). Il ne s'affiche qu'en développement.
 */
export default function ErreurElement() {
    const erreur = useRouteError();

    if (isRouteErrorResponse(erreur) && erreur.status === 404) {
        return (
            <Generale>
                <Erreur404 />
            </Generale>
        );
    }

    if (isRouteErrorResponse(erreur) && (erreur.status === 401 || erreur.status === 403)) {
        return (
            <Generale>
                <AccesRefuse />
            </Generale>
        );
    }

    // Tout le reste : 500, erreurs JS non catchées dans un loader/composant, erreurs réseau...
    const messageDev = import.meta.env.DEV ? (isRouteErrorResponse(erreur) ? String(erreur.data ?? erreur.statusText ?? `Erreur ${erreur.status}`) : erreur instanceof Error ? erreur.message : "Erreur inconnue") : undefined;

    return (
        <Generale>
            <Erreur500 message={messageDev} />
        </Generale>
    );
}
