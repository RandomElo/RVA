/**
 * Page d'erreur 401/403 — "accès réservé aux dossards enregistrés".
 * Composant purement présentationnel, affiché par ErreurElement quand la route
 * demandée nécessite d'être connecté (ou d'avoir les droits admin).
 *
 * Prérequis : lucide-react + react-router-dom.
 */

import { Link } from "react-router-dom";
import { Lock, LogIn, Home } from "lucide-react";

export default function AccesRefuse() {
    return (
        <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-6 py-16">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-club-100 text-club-600">
                    <Lock size={36} />
                </div>

                <span className="text-xs font-semibold uppercase tracking-wide text-club-600">Accès réservé</span>
                <h1 className="mt-2 font-display text-2xl font-bold text-[#040F33] sm:text-3xl">Dossard requis</h1>
                <p className="mt-3 text-sm leading-relaxed text-[#0B2270]/70">Cette page est réservée aux membres du club. Connectez-vous avec votre compte pour accéder à cette partie du parcours.</p>

                <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
                    <Link to="/connexion" className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270]">
                        <LogIn size={16} />
                        Se connecter
                    </Link>
                    <Link to="/" className="flex items-center justify-center gap-2 rounded-lg border border-club-200 px-5 py-2.5 text-sm font-medium text-[#0B2270] transition hover:bg-club-50">
                        <Home size={16} />
                        Retour à l'accueil
                    </Link>
                </div>
            </div>
        </div>
    );
}
