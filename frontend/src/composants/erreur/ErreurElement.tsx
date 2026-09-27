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
 * Pas de redirection automatique vers /connexion : un visiteur non connecté qui tape une URL
 * inexistante voit bien le 404. Pour un 401/403, AccesRefuse propose un bouton "Se connecter".
 * Le message d'erreur brut (stack trace, requête SQL, chemin serveur...) ne s'affiche qu'en
 * développement.
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
