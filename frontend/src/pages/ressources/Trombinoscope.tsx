/**
 * Page privée : trombinoscope des membres.
 *
 * Prérequis :
 * 1. lucide-react installé.
 * 2. Accessible uniquement aux membres connectés (contrôle fait par la route parente,
 *    voir le flux whitelist + Google/Apple du §3.3).
 * 3. Remplacer `chargerMembres` par un vrai appel API (GET /api/membres).
 * 4. Route suggérée : /membres (ou /trombinoscope).
 */

import { useEffect, useMemo, useState } from "react";
import { Search, Users, UserRound, X } from "lucide-react";
import { useRequete } from "../../fonctions/requete";

type Membre = {
    prenom: string;
    nom: string;
    cheminTrombinoscope?: string;
    // groupe?: string; // ex. "Groupe 1 — confirmés", "Groupe 2 — intermédiaires"...
};

const GROUPES: { value: string; label: string }[] = [
    { value: "tous", label: "Tous" },
    { value: "Groupe 1 — confirmés", label: "Confirmés" },
    { value: "Groupe 2 — intermédiaires", label: "Intermédiaires" },
    { value: "Groupe 3 — débutants", label: "Débutants" },
];

function initiales(prenom: string, nom: string) {
    return `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
}

export default function Trombinoscope() {
    const [membres, setMembres] = useState<Membre[] | null>(null);
    const [recherche, setRecherche] = useState("");
    const [groupe, setGroupe] = useState("tous");
    const [membreAgrandi, setMembreAgrandi] = useState<Membre | null>(null);

    const requete = useRequete()

    useEffect(() => {
        document.title = "Trombinoscope - Running Vincennes Association";

        async function recupererDonnees() {
            const donnees = await requete({ url: "/utilisateurs/trombinoscope" })
            setMembres(donnees)
        }
        recupererDonnees()
    }, []);

    // Fermeture de la photo agrandie avec la touche Échap
    useEffect(() => {
        if (!membreAgrandi) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setMembreAgrandi(null);
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [membreAgrandi]);

    const membresFiltres = useMemo(() => {
        if (!membres) return [];
        const q = recherche.trim().toLowerCase();
        return membres
            // .filter((m) => groupe === "tous" || m.groupe === groupe)
            .filter((m) => !q || `${m.prenom} ${m.nom}`.toLowerCase().includes(q))
            .sort((a, b) => a.prenom.localeCompare(b.prenom));
    }, [membres, recherche, groupe]);

    return (
        <div className="mx-auto w-6xl px-6 py-12">
            {/* En-tête */}
            <header className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-club-100 text-club-600">
                    <Users size={20} />
                </div>
                <div>
                    <h1 className="font-display text-2xl font-bold text-[#040F33] sm:text-3xl">Trombinoscope</h1>
                    <p className="text-sm text-[#0B2270]/60">{membres ? `${membres.length} membres du club` : "Chargement…"}</p>
                </div>
            </header>

            {/* Recherche + filtre par groupe */}
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0B2270]/40" />
                    <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un membre…" className="w-full rounded-lg border border-club-200 py-2.5 pl-9 pr-3 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200" />
                </div>
                <nav className="flex flex-wrap gap-2">
                    {GROUPES.map((g) => (
                        <button key={g.value} type="button" onClick={() => setGroupe(g.value)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${groupe === g.value ? "bg-club-600 text-white" : "bg-club-50 text-[#0B2270] hover:bg-club-100"}`}>
                            {g.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Grille de membres */}
            {membres === null ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-club-100 p-4">
                            <div className="h-16 w-16 animate-pulse rounded-full bg-club-100" />
                            <div className="h-3 w-20 animate-pulse rounded bg-club-100" />
                        </div>
                    ))}
                </div>
            ) : membresFiltres.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-club-200 py-16 text-center">
                    <UserRound size={28} className="text-[#0B2270]/30" />
                    <p className="text-sm text-[#0B2270]/60">Aucun membre ne correspond à cette recherche.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {membresFiltres.map((m, key) => (
                        <div key={key} className="flex flex-col items-center gap-2 rounded-xl border border-club-100 bg-white p-4 text-center transition hover:border-club-300 hover:shadow-sm">
                            {m.cheminTrombinoscope ? (
                                <button
                                    type="button"
                                    onClick={() => setMembreAgrandi(m)}
                                    className="h-16 w-16 shrink-0 cursor-zoom-in rounded-full outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-club-400"
                                    aria-label={`Agrandir la photo de ${m.prenom} ${m.nom}`}
                                >
                                    <img src={"/utilisateurs/photo/" + m.cheminTrombinoscope} alt={`Photo de ${m.prenom} ${m.nom}`} className="h-16 w-16 rounded-full object-cover" />
                                </button>
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-club-100 font-display text-lg font-semibold text-club-600">{initiales(m.prenom, m.nom)}</div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-[#040F33]">
                                    {m.prenom} {m.nom}
                                </p>
                                {/* {m.groupe && <p className="text-xs text-[#0B2270]/50">{m.groupe.replace(/^Groupe \d — /, "")}</p>} */}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox : photo agrandie */}
            {membreAgrandi && membreAgrandi.cheminTrombinoscope && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
                    onClick={() => setMembreAgrandi(null)}
                >
                    <button
                        type="button"
                        onClick={() => setMembreAgrandi(null)}
                        aria-label="Fermer"
                        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X size={22} />
                    </button>
                    <figure
                        className="flex max-h-full max-w-full flex-col items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={"/utilisateurs/photo/" + membreAgrandi.cheminTrombinoscope}
                            alt={`Photo de ${membreAgrandi.prenom} ${membreAgrandi.nom}`}
                            className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                        />
                        <figcaption className="text-sm font-medium text-white/90">
                            {membreAgrandi.prenom} {membreAgrandi.nom}
                        </figcaption>
                    </figure>
                </div>
            )}
        </div>
    );
}