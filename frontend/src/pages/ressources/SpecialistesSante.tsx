/**
 * Page : spécialistes de santé recommandés par le club.
 *
 * Prérequis :
 * 1. lucide-react installé.
 * 2. Remplacer `chargerSpecialistes` par un vrai appel API (GET /api/specialistes),
 *    ou par du contenu géré depuis le back-office si tu veux que ce soit éditable
 *    par le bénévole plus tard (même logique que les articles).
 * 3. Route suggérée : /ressources/specialistes-sante (ou /specialistes-sante).
 */

import { useEffect, useMemo, useState } from "react";
import { MapPin, Phone, ExternalLink, Search, Loader2, Inbox, Plus } from "lucide-react";
import { useRequete } from "../../fonctions/requete";
import { useAuth } from "../../contexts/AuthContext";
import { OPTIONS } from "../../constantes/types/specialistesSante";
import type { Specialiste, Specialite } from "../../constantes/types/specialistesSante";
import ModalNouveauSpecialiste from "../../composants/specialistesSante/ModalNouveauSpecialiste";
import { useRequeteJSON } from "../../fonctions/requeteJSON";

const LABEL_SPECIALITE: Record<Specialite, string> = {
    kine: "Kinésithérapeute",
    kine_sport: "Kiné du sport",
    podologue: "Podologue",
    osteopathe: "Ostéopathe",
    medecin_sport: "Médecin du sport",
};

const ONGLETS_SPECIALISTE = [
    ...OPTIONS,
    { value: "tous", label: "Tous" },
];

export default function SpecialistesSante() {
    const [specialistes, setSpecialistes] = useState<Specialiste[] | null>(null);
    const [onglet, setOnglet] = useState<(typeof ONGLETS_SPECIALISTE)[number]["value"] | "tous">("tous");
    const [recherche, setRecherche] = useState("");
    const [modalOuvert, setModalOuvert] = useState(false);
    const [specialstesSanteJSON, setSpecialstesSanteJSON] = useState<any>({})

    const requete = useRequete()
    const requeteJSON = useRequeteJSON()
    const { role } = useAuth()

    useEffect(() => {
        document.title = "Spécialistes & Recommandations — Running Vincennes Association";

        async function recuperationDonnees() {
            try {
                // 1. requeteJSON est gérée séparément pour le Stale-While-Revalidate
                // Le callback met à jour si le serveur renvoie de nouvelles données
                const donneesInitiales = await requeteJSON("ressources/specialistes-sante", (nouvellesDonnees) => {
                    if (nouvellesDonnees) setSpecialstesSanteJSON(nouvellesDonnees);
                });

                if (donneesInitiales) {
                    setSpecialstesSanteJSON(donneesInitiales);
                }

                // 2. Requête API classique attendue avec await
                const reponse = await requete({ url: "/specialistes/recuperer" });
                setSpecialistes(reponse);

            } catch (error) {
                console.error("Erreur lors de la récupération des spécialistes :", error);
            }
        }

        recuperationDonnees();
    }, []);

    const specialistesFiltres = useMemo(() => {
        if (!specialistes) return [];
        const q = recherche.trim().toLowerCase();
        return specialistes
            .filter((s) => onglet === "tous" || s.specialite === onglet)
            .filter((s) => !q || s.nom.toLowerCase().includes(q));
    }, [specialistes, onglet, recherche]);


    if (!specialstesSanteJSON) {
        return (
            <div className="flex items-center justify-center gap-2 mx-auto py-24 text-lg text-[#0B2270]/60">
                <Loader2 size={25} className="animate-spin" />
                Chargement …
            </div>
        );
    }

    return (
        <div className="mx-auto w-5xl px-6 py-12">
            {/* En-tête */}
            <header className="mb-8 flex items-center justify-between gap-3">
                <div>
                    <div>
                        <h1 className="font-display text-2xl font-bold text-[#040F33] sm:text-3xl">{specialstesSanteJSON.titre}</h1>
                        <p className="text-sm text-[#0B2270]/60">{specialstesSanteJSON.description}</p>
                    </div>
                </div>
                <button className="flex items-center justify-center cursor-pointer gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition bg-accent-500 hover:bg-accent-700" onClick={() => setModalOuvert(true)}>
                    <Plus size={18} />

                    {role == "administrateur" ? "Ajouter " : "Suggérer "}un spécialiste
                </button>
            </header >

            {/* Filtres */}
            < div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" >
                <nav className="flex flex-wrap gap-2">
                    {ONGLETS_SPECIALISTE.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => setOnglet(o.value)}
                            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${onglet === o.value ? "bg-club-600 text-white" : "bg-club-50 text-[#0B2270] hover:bg-club-100"
                                }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </nav>
                <div className="relative w-full sm:max-w-xs">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0B2270]/40" />
                    <input
                        type="search"
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        placeholder="Nom"
                        className="w-full rounded-lg border border-club-200 py-2.5 pl-9 pr-3 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                    />
                </div>
            </div >

            {/* Liste */}
            {
                specialistes === null ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#0B2270]/60">
                        <Loader2 size={18} className="animate-spin" />
                        Chargement…
                    </div>
                ) : specialistesFiltres.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-club-200 py-16 text-center">
                        <Inbox size={28} className="text-[#0B2270]/30" />
                        <p className="text-sm text-[#0B2270]/60">Aucun résultat pour cette recherche.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {specialistesFiltres.map((s, key) => (
                            <div key={key} className="flex flex-col gap-3 rounded-xl border border-club-100 bg-white p-5 transition hover:border-club-300 hover:shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="inline-block rounded-full bg-club-100 px-2.5 py-0.5 text-xs font-medium text-club-800">
                                            {LABEL_SPECIALITE[s.specialite]}
                                        </span>
                                        <h2 className="mt-2 font-display text-base font-semibold text-[#040F33]">{s.nom}</h2>
                                    </div>
                                </div>

                                {s.detail && <p className="text-sm text-[#0B2270]/70">{s.detail}</p>}

                                <div className="mt-1 flex flex-col gap-1.5 border-t border-club-50 pt-3 text-sm text-[#0B2270]/70">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin size={14} className="shrink-0 text-club-500" />
                                        {s.adresse}
                                    </span>
                                    {s.telephone && (
                                        <a href={`tel:${s.telephone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 transition hover:text-club-600">
                                            <Phone size={14} className="shrink-0 text-club-500" />
                                            {s.telephone}
                                        </a>
                                    )}
                                    {s.lienReservation && (
                                        <a href={s.lienReservation} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition hover:text-club-600">
                                            <ExternalLink size={14} className="shrink-0 text-club-500" />
                                            Site web
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            <ModalNouveauSpecialiste
                ouvert={modalOuvert}
                onFermer={() => {
                    setModalOuvert(false);
                }}
                setSpecialistes={setSpecialistes}
            />
        </div >

    );
}