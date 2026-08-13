/**
 * Page d'erreur 404 — "page hors-piste".
 * Composant purement présentationnel : pas de logique de dispatch ici, ton error provider
 * (errorElement + useRouteError côté router) décide déjà quand l'afficher.
 *
 * Prérequis :
 * 1. lucide-react + react-router-dom.
 * 2. Utilisation typique :
 *
 *    function ErreurRoute() {
 *      const erreur = useRouteError();
 *      if (isRouteErrorResponse(erreur) && erreur.status === 404) return <Erreur404 />;
 *      return <Erreur500 />;
 *    }
 */

import { Link } from "react-router-dom";
import { MapPinOff, Home, RotateCw } from "lucide-react";
import { useErreur } from "../../contexts/ErreurContext";

export default function Erreur404() {
    const { setErreur } = useErreur();

    return (
        <div className="conteneurPage flex min-h-[calc(100vh-140px)] items-center justify-center px-6 py-16">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-club-100 text-club-600">
                    <MapPinOff size={36} />
                </div>

                <span className="text-xs font-semibold uppercase tracking-wide text-club-600">Erreur 404</span>
                <h1 className="mt-2 font-display text-2xl font-bold text-[#040F33] sm:text-3xl">Hors-piste !</h1>
                <p className="mt-3 text-sm leading-relaxed text-[#0B2270]/70 w-110">Vous êtes sorti du parcours balisé — cette page n'existe pas, ou plus. Même les meilleurs coureurs ratent parfois un marquage au sol. Faisons demi-tour.</p>

                <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
                    {/* Bouton Recharger */}
                    <button
                        type="button"
                        onClick={() => {
                            setErreur(null);
                            window.location.reload();
                        }}
                        className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270]"
                    >
                        <RotateCw size={16} />
                        Rafraîchir la page
                    </button>

                    <Link onClick={() => setErreur(null)} to="/" className="flex items-center justify-center gap-2 rounded-lg border border-club-200 px-5 py-2.5 text-sm font-medium text-[#0B2270] transition hover:bg-club-50">
                        <Home size={16} />
                        Retour à la ligne de départ
                    </Link>
                </div>
            </div>
        </div>
    );
}
