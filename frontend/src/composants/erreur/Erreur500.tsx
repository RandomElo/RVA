/**
 * Page d'erreur 500 — "le serveur a fait un DNF" (Did Not Finish).
 * Composant purement présentationnel : pas de logique de dispatch ici.
 *
 * Prérequis :
 * 1. lucide-react + react-router-dom.
 * 2. `message` est optionnel — si ton error provider a le détail de l'erreur (dev only,
 *    à ne jamais afficher tel quel en prod pour des raisons de sécurité), tu peux le passer.
 */

import { Link } from "react-router-dom";
import { ServerCrash, Home, RotateCw } from "lucide-react";

type Props = {
    message?: string;
};

export default function Erreur500({ message }: Props) {
    return (
        <div className="conteneurPage flex min-h-[calc(100vh-140px)] items-center justify-center px-6 py-16">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                    <ServerCrash size={36} />
                </div>

                <span className="text-xs font-semibold uppercase tracking-wide text-accent-600">Erreur 500</span>
                <h1 className="mt-2 font-display text-2xl font-bold text-[#040F33] sm:text-3xl">DNF du serveur</h1>
                <p className="mt-3 text-sm leading-relaxed text-[#0B2270]/70">Notre serveur vient d'abandonner en pleine course — un coup de chaud, ça arrive. L'équipe technique est déjà en route vers le point de ravitaillement pour le remettre sur pied.</p>

                {message && <p className="mt-3 rounded-lg bg-club-50 px-3 py-2 font-mono text-xs text-[#0B2270]/60">{message}</p>}

                <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
                    <button type="button" onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270]">
                        <RotateCw size={16} />
                        Relancer la course
                    </button>
                    <Link to="/" className="flex items-center justify-center gap-2 rounded-lg border border-club-200 px-5 py-2.5 text-sm font-medium text-[#0B2270] transition hover:bg-club-50">
                        <Home size={16} />
                        Retour à l'accueil
                    </Link>
                </div>
            </div>
        </div>
    );
}
